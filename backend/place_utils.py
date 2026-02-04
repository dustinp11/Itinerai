import requests
import json


def get_distance(api_key, start, dest, mode="DRIVE"):
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration"
    }

    json_body = {
        "origin": {
            "address": start
        },
        "destination": {
            "address": dest
        },
        "travelMode": mode.upper()
    }

    response = requests.post(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        json=json_body,
        headers=headers
    )
    dist = response.json().get("routes", {})[0].get("distanceMeters", None)
    return dist


def bayesian_avg(rating, num_ratings):
    m = 50 # arbitrary choice for minimum ratings, push higher for
    C = 4.0  # prior mean rating, could be global average
    sum_R = rating * num_ratings
    return (C * m + sum_R) / (m + num_ratings)


def compute_weighted_score(api_key, bscore, price, budget, start=None, end=None, distance=None, mode="DRIVE"):
    """
    Computes weighted score for a place.
    If start/end/distance are not provided, distance is excluded and weights shift to bscore and budget.
    """
    price = price or 1
    budget_match = 1 if price <= budget else 0

    if start and end and distance:
        dist = get_distance(api_key, start, end, mode=mode)
        distance_match = 1 if dist and dist <= distance else 0
        return 0.4 * bscore + 0.2 * budget_match + 0.4 * distance_match

    return 0.6 * bscore + 0.4 * budget_match


def extract_place_info(api_key, place, budget, start=None, mode="DRIVE", distance=None):
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
    weighted_score = compute_weighted_score(api_key, bscore, price_level, budget, start=start, end=place.get("formattedAddress"), distance=distance, mode=mode)
    return {
        "rating": rating,
        "ratingCount": num_ratings,
        "priceLevel": price_level,
        "name": place.get("displayName", {}).get("text"),
        "openNow": place.get("regularOpeningHours", {}).get("openNow"),
        "address": place.get("formattedAddress"),
        "score": weighted_score,
    }


def google_query(api_key, query, budget, start=None, distance=None, mode="DRIVE"):
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
            "places.regularOpeningHours"
        ),
    }
    response = requests.post(
        "https://places.googleapis.com/v1/places:searchText",
        json={"textQuery": query},
        headers=headers,
    )
    places = response.json().get("places", [])
    res = [extract_place_info(api_key, place, budget, start, mode, distance) for place in places]
    return sorted(res, key=lambda x: x["score"], reverse=True)