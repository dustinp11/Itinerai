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


def build_query(activities, location):
    activities_str = " or ".join(activities)
    return f"{activities_str} near {location}"


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


def search_places(activities, location, budget):
    prefs = PreferenceStore.get()
    distance = parse_distance_miles(prefs.get("travelDistance"))
    transport_modes = prefs.get("transportModes", [])
    mode = TRANSPORT_MODE_MAP.get(transport_modes[0], "DRIVE") if transport_modes else "DRIVE"

    query = build_query(activities, location)
    return google_query(API_KEY, query, budget, start=location, distance=distance, mode=mode)


@app.route("/search", methods=["GET"])
def search():
    prefs = PreferenceStore.get()

    activities_str = request.args.get("activities", "")
    activities = [a.strip() for a in activities_str.split(",") if a.strip()]
    if not activities:
        activities = prefs.get("activities", [])

    city = request.args.get("city", "") or request.args.get("location", "")

    budget = map_budget(request.args.get("budget") or prefs.get("budget", "moderate"))

    if not activities or not city:
        return jsonify({"error": "activities and city are required"}), 400

    places = search_places(activities, city, budget)

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

    return jsonify({"ok": True, "preference": PreferenceStore.get()}), 200


@app.route("/users/preferences", methods=["GET"])
def get_preferences():
    return jsonify({"ok": True, "preference": PreferenceStore.get()}), 200



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4999, debug=True)

