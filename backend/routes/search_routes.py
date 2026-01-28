"""Search and places-related routes"""
from flask import Blueprint, request, jsonify
from extensions import mongo
from datetime import datetime, timedelta
import json
import os

search_bp = Blueprint('search', __name__, url_prefix='/api')

# Load static data
with open(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'places_data.json')) as f:
    STATIC_DATA = json.load(f)


def extract_place_info(place):
    """Extract relevant information from place data"""
    return {
        "name": place.get("name"),
        "open_now": place.get("opening_hours", {}).get("open_now"),
        "price_level": place.get("price_level"),
        "rating": place.get("rating"),
        "user_ratings_total": place.get("user_ratings_total")
    }


def search_places(query):
    """Search for places based on query"""
    # result = gmaps.places(query)
    # places = result.get("results", [])
    places = STATIC_DATA.get("results", [])
    return [extract_place_info(p) for p in places]


@search_bp.route("/search", methods=["GET"])
def search():
    """Search endpoint for places with MongoDB caching"""
    query = request.args.get("query", "")
    if not query:
        return jsonify({"error": "query parameter required"}), 400
    
    # Check cache first
    cached_data = get_cached_results(query)
    if cached_data is not None:
        return jsonify({
            "results": cached_data,
            "cached": True
        })
    
    # If not cached, fetch fresh data
    places = search_places(query)
    
    # Cache the results in MongoDB
    cache_results(query, places)
    
    return jsonify({
        "results": places,
        "cached": False
    })


@search_bp.route("/cache/clear", methods=["POST"])
def clear_cache():
    """Clear all cached search results"""
    try:
        result = mongo.db.search_cache.delete_many({})
        return jsonify({
            "message": "Cache cleared successfully",
            "deleted_count": result.deleted_count
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@search_bp.route("/cache/clean", methods=["POST"])
def clean_cache():
    """Clear all cache entries (no expiration in use)"""
    try:
        result = mongo.db.search_cache.delete_many({})
        return jsonify({
            "message": "All cache entries removed",
            "deleted_count": result.deleted_count
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def cache_results(query, places_json):
    """Cache search results in MongoDB"""
    try:
        cache_entry = {
            'query': query,
            'results': places_json,
        }
        # Update if exists, insert if not (upsert)
        mongo.db.search_cache.update_one(
            {'query': query},
            {'$set': cache_entry},
            upsert=True
        )
        return True
    except Exception as e:
        print(f"Error caching results: {e}")
        return False


def get_cached_results(query):
    """Get cached results from MongoDB"""
    try:
        cached = mongo.db.search_cache.find_one({'query': query})
        
        if not cached:
            return None
        
        return cached['results']
    except Exception as e:
        print(f"Error retrieving cached results: {e}")
        return None
