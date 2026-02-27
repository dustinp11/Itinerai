from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from dataclasses import asdict
import os
import json
import uuid
import requests

from preferences import Preference, PreferenceStore
from pins import Pin, PinStore
from itineraries import Itinerary, ItineraryStore
from place_utils import google_query, haversine_distance, bayesian_avg

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '', '.env'))

app = Flask(__name__)
CORS(app)

API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

PREFS_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'user_preferences.json')
PLACES_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'places_data.json')
PINS_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'pins_data.json')
ITINERARIES_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'itineraries_data.json')
PreferenceStore.init(PREFS_PATH)
PinStore.init(PINS_PATH)
ItineraryStore.init(ITINERARIES_PATH)

# Onboarding stores budget as "budget" / "moderate" / "luxury".
# Map to Google price levels (0-4) using the upper bound of each range.
BUDGET_MAP = {
    "budget": 1,      # $0-$50
    "moderate": 2,    # $50-$150
    "luxury": 4,      # $150-$500+
}

def map_budget(raw):
    """Convert a budget value to a price-level int, whether it's already
    a number or one of the onboarding label strings."""
    if isinstance(raw, int):
        return raw
    try:
        return int(raw)
    except (TypeError, ValueError):
        return BUDGET_MAP.get(str(raw), 2)


def build_query(activity, location):
    return f"{activity} near {location}"


def parse_distance_miles(raw):
    """Parse '100 miles' or '250+ miles' into meters. Returns None if unparseable."""
    if not raw:
        return None
    numeric = raw.replace("miles", "").replace("+", "").strip()
    try:
        return int(float(numeric) * 1609.34)
    except (TypeError, ValueError):
        return None


TRANSPORT_MODE_MAP = {
    "car": "DRIVE",
    "walking": "WALK",
    "public": "TRANSIT",
    "plane": "FLY",
}


def merge_places(places):
    """Deduplicate places by name, merging their tags lists."""
    seen = {}
    for place in places:
        name = place["name"]
        if name in seen:
            existing_tags = seen[name].get("tags", [])
            new_tags = place.get("tags", [])
            merged = list(dict.fromkeys(existing_tags + new_tags))
            seen[name] = {**seen[name], "tags": merged}
        else:
            seen[name] = place
    return list(seen.values())


BUDGET_SIGNAL_QUERIES = {
    1: "cheap affordable",
    2: "mid-range",
    3: "upscale nice",
    4: "luxury premium",
}

PRICE_LABELS = {0: "free", 1: "budget-friendly", 2: "moderate", 3: "upscale", 4: "luxury"}


def search_places(activities, location, budget, clerk_user_id=None):
    prefs = {}
    if clerk_user_id:
        prefs = PreferenceStore.get(clerk_user_id) or {}
    distance = parse_distance_miles(prefs.get("travelDistance"))

    all_places = []
    for activity in activities:
        query = build_query(activity, location)
        results = google_query(API_KEY, query, budget, tag=activity, distance=distance)
        all_places.extend(results)

    all_places = merge_places(all_places)
    return sorted(all_places, key=lambda x: x["score"], reverse=True)


@app.route("/search", methods=["GET"])
def search():
    clerk_user_id = request.args.get("clerkUserId")
    prefs = {}
    if clerk_user_id:
        prefs = PreferenceStore.get(clerk_user_id) or {}

    activities_str = request.args.get("activities", "")
    activities = [a.strip() for a in activities_str.split(",") if a.strip()]
    if not activities:
        activities = prefs.get("activities", [])

    city = request.args.get("city", "") or request.args.get("location", "")

    budget = map_budget(request.args.get("budget") or prefs.get("budget", "moderate"))

    if not activities or not city:
        return jsonify({"error": "activities and city are required"}), 400

    places = search_places(activities, city, budget, clerk_user_id)

    with open(PLACES_PATH, "w") as f:
        json.dump(places, f, indent=2)

    return jsonify(places)


# Place types that are too generic to use as meaningful query signals
GENERIC_TYPES = {
    "point_of_interest", "establishment", "food", "store",
    "health", "finance", "place_of_worship",
}


@app.route("/next-places", methods=["POST"])
def next_places():
    data = request.get_json(silent=True) or {}

    clerk_user_id = data.get("clerkUserId")
    selected_places = data.get("selectedPlaces", [])
    city = data.get("city", "")
    exclude_names = set(data.get("excludeNames", []))

    prefs = {}
    if clerk_user_id:
        prefs = PreferenceStore.get(clerk_user_id) or {}

    budget = map_budget(data.get("budget") or prefs.get("budget", "moderate"))

    coords = [
        (p["latitude"], p["longitude"])
        for p in selected_places
        if p.get("latitude") and p.get("longitude")
    ]
    if not coords:
        return jsonify({"error": "selectedPlaces must include at least one place with coordinates"}), 400

    centroid_lat = sum(lat for lat, _ in coords) / len(coords)
    centroid_lng = sum(lng for _, lng in coords) / len(coords)

    # --- Signal extraction (Phase 1) ---

    # 1. Type frequency — count specific Google place types across all selections
    type_freq = {}
    for p in selected_places:
        for t in (p.get("types") or []):
            if t not in GENERIC_TYPES:
                type_freq[t] = type_freq.get(t, 0) + 1

    # Top 2 types by frequency; these are valid Google place type strings
    google_types = sorted(type_freq, key=lambda t: type_freq[t], reverse=True)[:2]

    # Fallback: use activity tags, then user preferences
    if not google_types:
        google_types = list({
            tag
            for p in selected_places
            for tag in (p.get("tags") or ([p.get("tag")] if p.get("tag") else []))
        }) or prefs.get("activities", [])

    if not google_types:
        return jsonify({"error": "no activities could be determined from selections or preferences"}), 400

    # 2. Dynamic radius — tight cluster (<1500 m spread) vs spread out
    max_spread = max(
        haversine_distance(centroid_lat, centroid_lng, lat, lng)
        for lat, lng in coords
    )
    dynamic_radius = 1500.0 if max_spread < 1500 else 5000.0

    # 3. Average price level for post-fetch filtering
    price_levels = [p["priceLevel"] for p in selected_places if p.get("priceLevel") is not None]
    avg_price = round(sum(price_levels) / len(price_levels)) if price_levels else None

    location_bias = {"lat": centroid_lat, "lng": centroid_lng, "radius": dynamic_radius}
    distance = parse_distance_miles(prefs.get("travelDistance"))

    # Build a human-readable reason from the active signals, shared across all
    # results in a given type batch.
    def build_reason(type_query):
        readable = type_query.replace("_", " ").title()
        return [f"Matches your interest in {readable}s"]

    # --- Fetch ---
    # Use includedType only for types sourced from the Google taxonomy (type_freq),
    # not for activity-tag fallbacks.
    all_places = []
    for type_query in google_types:
        query = build_query(type_query, city)
        included_type = type_query if type_query in type_freq else None
        results = google_query(
            API_KEY, query, None,
            tag=type_query,
            distance=distance,
            location_bias=location_bias,
            included_type=included_type,
            max_results=5,
        )
        reason = build_reason(type_query)
        for place in results:
            place["recommended"] = True
            place["recommendedReason"] = reason
        all_places.extend(results)

    # Budget signal: if selected places reveal a cost preference, fetch more places at
    # that price point and post-filter to match. Skipped entirely when avg_price is None
    # (i.e. none of the selected places have price data — null is not free).
    if avg_price is not None:
        budget_prefix = BUDGET_SIGNAL_QUERIES.get(avg_price)
        if budget_prefix:
            budget_q = f"{budget_prefix} places near {city}"
            budget_results = google_query(
                API_KEY, budget_q, budget,
                tag=None,
                distance=distance,
                location_bias=location_bias,
                max_results=5,
            )
            for place in budget_results:
                place["recommended"] = True
                place["recommendedReason"] = f"Matches your {PRICE_LABELS.get(avg_price, 'price')} spending pattern"
            all_places.extend(budget_results)

    all_places = merge_places(all_places)
    all_places = [p for p in all_places if p["name"] not in exclude_names]

    # Post-filter: keep places within ±1 of the inferred price level.
    # Places with no price data pass through — null is not zero.
    if avg_price is not None:
        all_places = [
            p for p in all_places
            if p.get("priceLevel") is None or abs(p["priceLevel"] - avg_price) <= 1
        ]

    # Re-rank: combined normalized rating + proximity to centroid (60/40).
    for place in all_places:
        lat, lng = place.get("latitude"), place.get("longitude")
        bscore = bayesian_avg(place.get("rating") or 0, place.get("ratingCount") or 0)
        if lat is not None and lng is not None:
            dist_km = haversine_distance(centroid_lat, centroid_lng, lat, lng) / 1000
            proximity = 1 / (1 + dist_km / 10)
            rating_norm = min(bscore / 5.0, 1.0)
            place["score"] = round(0.6 * rating_norm + 0.4 * proximity, 4)
            place["distanceKm"] = round(dist_km, 2)
        else:
            place["score"] = round(min(bscore / 5.0, 1.0), 4)
            place["distanceKm"] = None

    all_places = sorted(all_places, key=lambda x: x["score"], reverse=True)

    return jsonify(all_places)


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/users/preferences", methods=["POST"])
def save_preferences():
    data = request.get_json(silent=True) or {}

    clerk_user_id = data.get("clerkUserId")
    prefs = data.get("preferences") or {}

    if not clerk_user_id:
        return jsonify({"error": "clerkUserId is required"}), 400

    pref_obj = Preference(
        clerkUserId=str(clerk_user_id),
        activities=prefs.get("activities", []) or [],
        budget=str(prefs.get("budget", "")),
        travelDistance=prefs.get("travelDistance"),
        transportModes=prefs.get("transportModes", []) or [],
    )

    PreferenceStore.set(pref_obj)

    return jsonify({"ok": True, "preference": PreferenceStore.get(clerk_user_id)}), 200


@app.route("/users/preferences", methods=["GET"])
def get_preferences():
    clerk_user_id = request.args.get("clerkUserId")
    if not clerk_user_id:
        return jsonify({"error": "clerkUserId is required"}), 400
    
    preference = PreferenceStore.get(clerk_user_id)
    if not preference:
        return jsonify({"error": "Preferences not found for this user"}), 404
    
    return jsonify({"ok": True, "preference": preference}), 200



@app.route("/pins", methods=["POST"])
def save_pin():
    data = request.get_json(silent=True) or {}
    clerk_user_id = data.get("clerkUserId")
    itinerary_id = data.get("itineraryId")
    if not clerk_user_id or not itinerary_id:
        return jsonify({"error": "clerkUserId and itineraryId are required"}), 400

    pin = Pin(
        pin_id=data.get("pinId") or str(uuid.uuid4()),
        clerk_user_id=clerk_user_id,
        itinerary_id=itinerary_id,
        place_names=data.get("placeNames", []),
        places=data.get("places", []),
    )
    PinStore.save(pin)
    return jsonify({"pin": asdict(pin)}), 200


@app.route("/pins", methods=["GET"])
def get_pins():
    clerk_user_id = request.args.get("clerkUserId")
    if not clerk_user_id:
        return jsonify({"error": "clerkUserId is required"}), 400
    itinerary_id = request.args.get("itineraryId")
    if itinerary_id:
        pins = PinStore.get_by_itinerary(clerk_user_id, itinerary_id)
    else:
        pins = PinStore.get_by_user(clerk_user_id)
    return jsonify({"pins": pins}), 200


@app.route("/pins/<pin_id>", methods=["GET"])
def get_pin(pin_id):
    pin = PinStore.get(pin_id)
    if not pin:
        return jsonify({"error": "Pin not found"}), 404
    return jsonify({"pin": pin}), 200


@app.route("/pins/<pin_id>", methods=["DELETE"])
def delete_pin(pin_id):
    if PinStore.delete(pin_id):
        return jsonify({"ok": True}), 200
    return jsonify({"error": "Pin not found"}), 404


@app.route("/itineraries", methods=["POST"])
def save_itinerary():
    data = request.get_json(silent=True) or {}
    clerk_user_id = data.get("clerkUserId")
    itinerary_id = data.get("itineraryId")
    if not clerk_user_id or not itinerary_id:
        return jsonify({"error": "clerkUserId and itineraryId are required"}), 400

    itinerary = Itinerary(
        itinerary_id=itinerary_id,
        clerk_user_id=clerk_user_id,
        name=data.get("name", "My Itinerary"),
        city=data.get("city", ""),
        stop_count=data.get("stopCount", 0),
    )
    ItineraryStore.save(itinerary)
    return jsonify({"itinerary": asdict(itinerary)}), 200


@app.route("/itineraries", methods=["GET"])
def get_itineraries():
    clerk_user_id = request.args.get("clerkUserId")
    if not clerk_user_id:
        return jsonify({"error": "clerkUserId is required"}), 400
    itineraries = ItineraryStore.get_by_user(clerk_user_id)
    return jsonify({"itineraries": itineraries}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4999, debug=True)

