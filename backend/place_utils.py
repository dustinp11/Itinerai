import requests
import math
import json
import os

# Reverse lookup: google_place_type -> category name
# e.g. "italian_restaurant" -> "Restaurants"
_TYPE_TO_CATEGORY_PATH = os.path.join(
    os.path.dirname(__file__), '..', 'frontend', 'assets', 'place_type_to_category.json'
)
with open(_TYPE_TO_CATEGORY_PATH) as _f:
    TYPE_TO_CATEGORY: dict[str, str] = json.load(_f)


def get_place_category(types: list[str]) -> str | None:
    """Return the first matching category for a list of Google place types."""
    for t in types:
        category = TYPE_TO_CATEGORY.get(t)
        if category:
            return category
    return None


def get_distance(start, dest):
    """Compute Euclidean distance between two place objects using their lat/lng coordinates."""
    start_loc = start.get("location", {})
    dest_loc = dest.get("location", {})
    lat1, lng1 = start_loc.get("latitude", 0), start_loc.get("longitude", 0)
    lat2, lng2 = dest_loc.get("latitude", 0), dest_loc.get("longitude", 0)
    return math.sqrt((lat2 - lat1) ** 2 + (lng2 - lng1) ** 2)


def haversine_distance(lat1, lng1, lat2, lng2):
    """Compute great-circle distance in meters between two lat/lng points."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bayesian_avg(rating, num_ratings):
    m = 50 # arbitrary choice for minimum ratings, push higher for
    C = 4.0  # prior mean rating, could be global average
    sum_R = rating * num_ratings
    return (C * m + sum_R) / (m + num_ratings)


def compute_weighted_score(bscore, price, budget, start=None, end=None, distance=None):
    """
    Computes weighted score for a place in [0, 1].
    bscore (bayesian avg) is normalized to [0, 1] by dividing by max rating of 5.
    budget=None means no budget signal (activity-only results scored purely on rating).
    If start/end/distance are not provided, distance is excluded.
    """
    rating = min(bscore / 5.0, 1.0)
    has_distance = start and end and distance
    has_budget = budget is not None

    if has_distance:
        dist = get_distance(start, end)
        distance_match = 1 if dist <= distance else 0
        if has_budget:
            price = price or 1
            budget_match = 1 if price <= budget else 0
            return 0.4 * rating + 0.2 * budget_match + 0.4 * distance_match
        return 0.5 * rating + 0.5 * distance_match

    if has_budget:
        price = price or 1
        budget_match = 1 if price <= budget else 0
        return 0.6 * rating + 0.4 * budget_match

    return rating


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

    location = place.get("location", {})
    types = place.get("types", [])

    return {
        "rating": rating,
        "ratingCount": num_ratings,
        "priceLevel": price_level,
        "name": place.get("displayName", {}).get("text"),
        "openNow": place.get("regularOpeningHours", {}).get("openNow"),
        "address": place.get("formattedAddress"),
        "score": weighted_score,
        "image_url": image_url,
        "tags": [tag] if tag else [],
        "types": types,
        "category": get_place_category(types),
        "latitude": location.get("latitude"),
        "longitude": location.get("longitude"),
    }


def google_query(api_key, query, budget, tag=None, start=None, distance=None, location_bias=None, included_type=None, max_results=None):
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
            "places.photos,"
            "places.types"
        ),
    }
    body = {"textQuery": query}
    if max_results is not None:
        body["maxResultCount"] = max_results
    if included_type:
        body["includedType"] = included_type
    if location_bias:
        body["locationBias"] = {
            "circle": {
                "center": {
                    "latitude": location_bias["lat"],
                    "longitude": location_bias["lng"],
                },
                "radius": location_bias.get("radius", 5000.0),
            }
        }
    response = requests.post(
        "https://places.googleapis.com/v1/places:searchText",
        json=body,
        headers=headers,
    )
    places = response.json().get("places", [])
    res = [extract_place_info(tag or query, api_key, place, budget, start, distance) for place in places]
    return sorted(res, key=lambda x: x["score"], reverse=True)
