from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import json
import os

# import googlemaps

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

app = Flask(__name__)
CORS(app)

# gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_API_KEY"))

with open(os.path.join(os.path.dirname(__file__), '..', 'data', 'places_data.json')) as f:
    STATIC_DATA = json.load(f)


def extract_place_info(place):
    return {
        "name": place.get("name"),
        "open_now": place.get("opening_hours", {}).get("open_now"),
        "price_level": place.get("price_level"),
        "rating": place.get("rating"),
        "user_ratings_total": place.get("user_ratings_total")
    }


def search_places(query):
    # result = gmaps.places(query)
    # places = result.get("results", [])
    places = STATIC_DATA.get("results", [])
    return [extract_place_info(p) for p in places]


@app.route("/search", methods=["GET"])
def search():
    query = request.args.get("query", "")
    if not query:
        return jsonify({"error": "query parameter required"}), 400
    places = search_places(query)
    return jsonify(places)


if __name__ == "__main__":
    app.run(debug=True)
