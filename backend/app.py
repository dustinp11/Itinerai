from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import googlemaps

from preferences import Preference, PreferenceStore

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '', '.env'))

app = Flask(__name__)
CORS(app)

gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_API_KEY"))

# bayesian average constants
C = 3.5  # assumed global average rating
m = 50   # minimum ratings threshold


def bayesian_avg(rating, num_ratings):
    sum_R = rating * num_ratings
    return (C * m + sum_R) / (m + num_ratings)


def compute_weighted_score(bayesian_score, price_level, budget):
    price_level = price_level or 1
    budget_match = 1 if price_level <= budget else 0
    return  0.9 * bayesian_score + 0.1 * budget_match


def extract_place_info(place, budget):
    rating = place.get("rating", 0)
    num_ratings = place.get("user_ratings_total", 0)
    price_level = place.get("price_level")
    b_score = bayesian_avg(rating, num_ratings)
    return {
        "name": place.get("name"),
        "open_now": place.get("opening_hours", {}).get("open_now"),
        "price_level": price_level,
        "rating": rating,
        "user_ratings_total": num_ratings,
        "bayesian_score": b_score,
        "weighted_score": compute_weighted_score(b_score, price_level, budget)
    }


def build_query(activities, location):
    activities_str = " or ".join(activities)
    return f"{activities_str} near {location}"


def search_places(activities, location, budget):
    query = build_query(activities, location)
    result = gmaps.places(query)
    places = result.get("results", [])
    results = [extract_place_info(p, budget) for p in places]
    results.sort(key=lambda x: x["weighted_score"], reverse=True)
    return results


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

