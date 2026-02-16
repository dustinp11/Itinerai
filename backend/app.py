from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import json
import requests

from preferences import Preference, PreferenceStore
from place_utils import google_query

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '', '.env'))

app = Flask(__name__)
CORS(app)

API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

PREFS_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'user_preferences.json')
PLACES_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'places_data.json')
PreferenceStore.init(PREFS_PATH)

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



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4999, debug=True)

