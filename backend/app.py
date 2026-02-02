from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import json
import os

from preferences import Preference, PreferenceStore


# import googlemaps

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '', '.env'))

app = Flask(__name__)
CORS(app)

# gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_API_KEY"))

with open(os.path.join(os.path.dirname(__file__), '..', 'data', 'places_data.json')) as f:
    STATIC_DATA = json.load(f)

# Bayesian average constants
C = sum(p.get("rating", 0) for p in STATIC_DATA) / len(STATIC_DATA)  # global avg
m = 50  # minimum ratings threshold


def bayesian_avg(rating, num_ratings):
    sum_R = rating * num_ratings
    return (C * m + sum_R) / (m + num_ratings)


def extract_place_info(place):
    rating = place.get("rating", 0)
    num_ratings = place.get("user_ratings_total", 0)
    return {
        "name": place.get("name"),
        "open_now": place.get("open_now"),
        "price_level": place.get("price_level"),
        "rating": rating,
        "user_ratings_total": num_ratings,
        "bayesian_score": bayesian_avg(rating, num_ratings)
    }


def search_places(query):
    # result = gmaps.places(query)
    # places = result.get("results", [])
    places = STATIC_DATA  # already a list
    results = [extract_place_info(p) for p in places]
    results.sort(key=lambda x: x["bayesian_score"], reverse=True)
    return results


@app.route("/search", methods=["GET"])
def search():
    query = request.args.get("query", "")
    if not query:
        return jsonify({"error": "query parameter required"}), 400
    places = search_places(query)
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

