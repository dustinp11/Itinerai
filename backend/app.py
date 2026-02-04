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




def build_query(activities, location):
    activities_str = " or ".join(activities)
    return f"{activities_str} near {location}"


def search_places(activities, location, budget):
    prefs = PreferenceStore.get()
    distance = int(prefs["travelDistance"]) if prefs.get("travelDistance") else None
    transport_modes = prefs.get("transportModes", [])
    mode = transport_modes[0] if transport_modes else "DRIVE"

    query = build_query(activities, location)
    return google_query(API_KEY, query, budget, start=location, distance=distance, mode=mode)


@app.route("/search", methods=["GET"])
def search():
    activities_str = request.args.get("activities", "")
    activities = [a.strip() for a in activities_str.split(",") if a.strip()]
    location = request.args.get("location", "")
    budget = int(request.args.get("budget", 2))

    if not activities or not location:
        return jsonify({"error": "activities and location are required"}), 400

    places = search_places(activities, location, budget)
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

