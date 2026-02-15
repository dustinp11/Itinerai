import requests
import json
import math


def get_distance(start, dest):
    """Compute Euclidean distance between two place objects using their lat/lng coordinates."""
    start_loc = start.get("location", {})
    dest_loc = dest.get("location", {})
    lat1, lng1 = start_loc.get("latitude", 0), start_loc.get("longitude", 0)
    lat2, lng2 = dest_loc.get("latitude", 0), dest_loc.get("longitude", 0)
    return math.sqrt((lat2 - lat1) ** 2 + (lng2 - lng1) ** 2)


def bayesian_avg(rating, num_ratings):
    m = 50 # arbitrary choice for minimum ratings, push higher for
    C = 4.0  # prior mean rating, could be global average
    sum_R = rating * num_ratings
    return (C * m + sum_R) / (m + num_ratings)


def compute_weighted_score(bscore, price, budget, start=None, end=None, distance=None):
    """
    Computes weighted score for a place.
    If start/end/distance are not provided, distance is excluded and weights shift to bscore and budget.
    """
    price = price or 1
    budget_match = 1 if price <= budget else 0

    if start and end and distance:
        dist = get_distance(start, end)
        distance_match = 1 if dist <= distance else 0
        return 0.4 * bscore + 0.2 * budget_match + 0.4 * distance_match

    return 0.6 * bscore + 0.4 * budget_match


def extract_place_info(tag, api_key, place, budget, start=None, distance=None):
    PRICE_LEVEL_MAP = {
        "PRICE_LEVEL_FREE": 0,
        "PRICE_LEVEL_INEXPENSIVE": 1,
        "PRICE_LEVEL_MODERATE": 2,
        "PRICE_LEVEL_EXPENSIVE": 3,
        "PRICE_LEVEL_VERY_EXPENSIVE": 4,
    }

    rating = place.get("rating", 0)
    num_ratings = place.get("userRatingCount", 0)
    price_level = PRICE_LEVEL_MAP.get(place.get("priceLevel"))
    bscore = bayesian_avg(rating, num_ratings)
    weighted_score = compute_weighted_score(bscore, price_level, budget, start=start, end=place, distance=distance)

    photos = place.get("photos", [])
    image_url = None
    if photos:
        photo_name = photos[0].get("name")
        if photo_name:
            image_url = f"https://places.googleapis.com/v1/{photo_name}/media?maxWidthPx=400&key={api_key}"

    return {
        "rating": rating,
        "ratingCount": num_ratings,
        "priceLevel": price_level,
        "name": place.get("displayName", {}).get("text"),
        "openNow": place.get("regularOpeningHours", {}).get("openNow"),
        "address": place.get("formattedAddress"),
        "score": weighted_score,
        "image_url": image_url,
        "tag": tag
    }


def google_query(api_key, query, budget, tag=None, start=None, distance=None):
    """Call v2 searchText, extract and score places, return sorted by weighted_score."""
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": (
            "places.displayName,"
            "places.formattedAddress,"
            "places.priceLevel,"
            "places.rating,"
            "places.userRatingCount,"
            "places.regularOpeningHours,"
            "places.location,"
            "places.photos"
        ),
    }
    response = requests.post(
        "https://places.googleapis.com/v1/places:searchText",
        json={"textQuery": query},
        headers=headers,
    )
    places = response.json().get("places", [])
    res = [extract_place_info(tag or query, api_key, place, budget, start, distance) for place in places]
    return sorted(res, key=lambda x: x["score"], reverse=True)