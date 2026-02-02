# Itiner.ai - Travel Itinerary Planner Implementation Guide

## Project Overview

**Itiner.ai** is a context-aware travel itinerary planning application that helps users build personalized multi-stop trips through sequential location recommendations. The app uses Google Places API to suggest activities based on user preferences, budget, and geographic proximity.

**Project Type:** CS 125 - Next Generation Search Systems  
**Team:** Dustin Pham (lead), Karena Tran, Jae Yun Kim  
**Timeline:** 5-week development cycle

---

## Tech Stack

### Backend
- **Framework:** Flask (Python 3.9+)
- **Database:** MongoDB
- **APIs:** Google Places API
- **Key Libraries:** 
  - `flask` - Web framework
  - `flask-cors` - CORS support
  - `pymongo` - MongoDB driver
  - `googlemaps` - Google Maps API client
  - `python-dotenv` - Environment variable management
  - `requests` - HTTP library

### Frontend
- **Framework:** React Native with Expo
- **UI Library:** React Native Paper (Material Design)
- **Navigation:** React Navigation v6
- **Maps:** React Native Maps
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Key Libraries:**
  - `expo` - Development framework
  - `react-native-paper` - UI components
  - `react-native-maps` - Map integration
  - `@react-navigation/native` - Navigation
  - `zustand` - State management
  - `axios` - API calls

---

## Core Features & User Flow

### 1. Onboarding (4 Questions)
Users answer 4 questions to set preferences:
1. **Where do you want to go?** (California cities only for POC)
2. **What activities interest you?** (Select multiple: nature, food, culture, entertainment, shopping)
3. **What's your budget?** (budget/moderate/luxury)
4. **Max distance per activity?** (in miles, default: 5)

### 2. City Selection
- Display list of California cities
- User selects destination city
- Navigate to initial spots screen

### 3. Initial Popular Spots
- Show top 10-20 tourist attractions for selected city
- Ranked by: `(rating * 0.6) + (log10(review_count) / 3.0 * 0.4)`
- Display as cards with:
  - Photo
  - Name
  - Rating (stars)
  - Distance from city center
  - Type tags
- User selects first activity

### 4. Sequential Recommendations
After each selection, the app:
- Uses last selected location as search center
- Queries Google Places API within radius
- Ranks results using weighted algorithm
- Shows top 10 recommendations

**User Actions:**
- **Select** → Add to itinerary, becomes new search center
- **Shuffle** → Re-randomize current results
- **Expand Radius** → Increase search distance by 50%

### 5. Itinerary Summary
- Map view with numbered markers
- Route line connecting activities
- List view with:
  - Activity order
  - Name, rating, distance from previous
  - Estimated travel time between stops
- Total trip statistics

---

## System Architecture

```
┌─────────────────────────┐
│  React Native (Expo)    │
│  + React Native Paper   │
│  + React Navigation     │
└───────────┬─────────────┘
            │ HTTP/REST (Axios)
            │
┌───────────▼─────────────┐
│      Flask API          │
│  ┌──────────────────┐   │
│  │ Routes Layer     │   │
│  └────────┬─────────┘   │
│  ┌────────▼─────────┐   │
│  │ Services Layer   │   │
│  │ - Google Places  │   │
│  │ - Recommendation │   │
│  │ - Distance Calc  │   │
│  └────────┬─────────┘   │
│  ┌────────▼─────────┐   │
│  │ Repository Layer │   │
│  └────────┬─────────┘   │
└───────────┼─────────────┘
            │
    ┌───────┴────────┐
    │                │
┌───▼──────┐  ┌──────▼─────┐
│ MongoDB  │  │Google Places│
│          │  │    API      │
└──────────┘  └─────────────┘
```

---

## Database Schema (MongoDB)

### Collection: `users`
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  preferences: {
    budget: String,                 // "budget" | "moderate" | "luxury"
    activityTypes: [String],        // ["nature", "food", "culture", "entertainment", "shopping"]
    maxDistancePerActivity: Number  // miles (default: 5)
  },
  createdAt: Date
}
```

### Collection: `itineraries`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,                 // Reference to users collection
  city: String,                     // "san-francisco", "los-angeles", etc.
  createdAt: Date,
  updatedAt: Date,
  activities: [
    {
      placeId: String,              // Google Place ID (unique)
      name: String,
      rating: Number,               // 1.0 - 5.0
      userRatingsTotal: Number,
      priceLevel: Number,           // 0-4 (0=free, 4=very expensive)
      types: [String],              // Google Place types
      location: {
        lat: Number,
        lng: Number
      },
      address: String,
      photoReference: String,       // Google photo reference
      order: Number,                // Position in itinerary (1, 2, 3...)
      estimatedDuration: Number     // minutes (default: 60)
    }
  ],
  preferences: {                    // Snapshot of user prefs when created
    budget: String,
    activityTypes: [String],
    maxDistancePerActivity: Number
  },
  totalDistance: Number,            // Total miles
  estimatedTotalTime: Number        // Total minutes
}
```

### Collection: `places_cache`
**Purpose:** Cache Google Places API responses to reduce API calls and costs

```javascript
{
  _id: ObjectId,
  placeId: String,                  // Google Place ID (unique index)
  city: String,                     // "san-francisco"
  
  // GeoJSON format for geospatial queries
  location: {
    type: "Point",                  // Must be "Point"
    coordinates: [Number, Number]   // [longitude, latitude] - ORDER MATTERS!
  },
  
  // Data from Google Places API
  name: String,
  rating: Number,
  userRatingsTotal: Number,
  priceLevel: Number,
  types: [String],
  address: String,
  photoReference: String,
  openingHours: {
    openNow: Boolean,
    periods: [Object],
    weekdayText: [String]
  },
  website: String,
  phoneNumber: String,
  
  // Metadata
  lastUpdated: Date,                // For cache invalidation
  popularityScore: Number           // Pre-calculated for initial spots
}
```

### Required Indexes

```javascript
// places_cache collection
db.places_cache.createIndex({ location: "2dsphere" });  // CRITICAL for geospatial queries
db.places_cache.createIndex({ city: 1, popularityScore: -1 });  // For initial popular spots
db.places_cache.createIndex({ placeId: 1 }, { unique: true });  // Prevent duplicates
db.places_cache.createIndex({ types: 1 });  // For activity type filtering
db.places_cache.createIndex({ lastUpdated: 1 });  // For cache expiration

// itineraries collection
db.itineraries.createIndex({ userId: 1, createdAt: -1 });  // User's itineraries
db.itineraries.createIndex({ city: 1 });  // Filter by city

// users collection
db.users.createIndex({ email: 1 }, { unique: true });  // Unique emails
```

---

## Backend API Endpoints

### Base URL: `http://localhost:5000/api`

#### Cities
```
GET /api/cities
Description: Get list of supported California cities
Response: {
  cities: [
    { id: "san-francisco", name: "San Francisco", coordinates: { lat, lng } },
    { id: "los-angeles", name: "Los Angeles", coordinates: { lat, lng } },
    ...
  ]
}
```

#### Itinerary Management
```
POST /api/itinerary
Description: Create new itinerary with onboarding preferences
Body: {
  city: "san-francisco",
  preferences: {
    budget: "moderate",
    activityTypes: ["nature", "food"],
    maxDistancePerActivity: 5
  }
}
Response: {
  itinerary: { _id, city, preferences, activities: [], createdAt }
}

GET /api/itinerary/:id
Description: Get itinerary details
Response: { itinerary: {...} }

POST /api/itinerary/:id/add-activity
Description: Add activity to itinerary
Body: { placeId: "ChIJ..." }
Response: { itinerary: {...}, message: "Activity added" }

DELETE /api/itinerary/:id/remove-activity/:placeId
Description: Remove activity from itinerary
Response: { itinerary: {...}, message: "Activity removed" }
```

#### Recommendations
```
GET /api/itinerary/:id/initial-spots
Description: Get popular tourist spots for city (baseline ranking)
Response: {
  spots: [
    {
      placeId, name, rating, userRatingsTotal, priceLevel,
      location, types, photoReference, popularityScore
    },
    ...
  ],
  total: 20
}

POST /api/itinerary/:id/recommendations
Description: Get next activity recommendations based on last location
Body: { } (uses last activity from itinerary)
Response: {
  recommendations: [
    {
      place: { placeId, name, rating, location, ... },
      score: 0.85,
      distance: 1.2,  // miles
      scoreBreakdown: {
        rating: 0.92,
        distance: 0.88,
        typeMatch: 0.75,
        price: 0.80,
        popularity: 0.65
      }
    },
    ...
  ],
  lastActivity: { ... },
  searchCenter: { lat, lng },
  searchRadius: 5  // miles
}

POST /api/itinerary/:id/shuffle
Description: Shuffle current recommendations (add randomness)
Response: { recommendations: [...] }

POST /api/itinerary/:id/expand-radius
Description: Expand search radius by 50%
Response: { recommendations: [...], newRadius: 7.5 }
```

---

## Ranking Algorithm

### Initial Popular Spots (Baseline)
Used for city's first screen of tourist attractions:

```python
popularity_score = (rating * 0.6) + (log10(user_ratings_total + 1) / 3.0 * 0.4)
```

Sort by `popularity_score` descending, return top 20.

### Sequential Recommendations (Weighted)

**Formula:**
```python
total_score = 
  (0.30 * rating_score) +
  (0.25 * distance_score) +
  (0.20 * type_match_score) +
  (0.15 * price_score) +
  (0.10 * popularity_score)
```

**Component Calculations:**

1. **Rating Score** (0-1):
   ```python
   rating_score = rating / 5.0  # Normalize to 0-1
   # If no rating, use 0.5 (neutral)
   ```

2. **Distance Score** (0-1):
   ```python
   distance = haversine(last_location, current_place)  # in miles
   
   if distance > max_distance:
       return 0.0  # Heavy penalty
   
   distance_score = 1.0 - (distance / max_distance)
   # Closer = higher score
   ```

3. **Type Match Score** (0-1):
   ```python
   # Map user preferences to Google Place types
   user_types = expand_activity_types(preferences.activityTypes)
   # e.g., "food" → ["restaurant", "cafe", "bakery", "bar"]
   
   matches = len(set(place.types) & set(user_types))
   type_match_score = matches / len(user_types) if user_types else 0.5
   ```

4. **Price Score** (0-1):
   ```python
   budget_ranges = {
       "budget": (0, 1),      # Free to $
       "moderate": (1, 2),     # $ to $$
       "luxury": (2, 4)        # $$ to $$$$
   }
   
   min_price, max_price = budget_ranges[user_budget]
   place_price = place.priceLevel
   
   if min_price <= place_price <= max_price:
       return 1.0  # Perfect match
   
   # Partial penalty for nearby prices
   distance_from_range = min(
       abs(place_price - min_price),
       abs(place_price - max_price)
   )
   price_score = max(0, 1.0 - (distance_from_range * 0.25))
   ```

5. **Popularity Score** (0-1):
   ```python
   reviews = place.userRatingsTotal
   
   if reviews == 0:
       return 0.3  # Small baseline
   
   # Logarithmic scale (1000+ reviews = 1.0)
   popularity_score = min(1.0, log10(reviews + 1) / 3.0)
   ```

### Haversine Distance Formula
```python
import math

def haversine_distance(lat1, lng1, lat2, lng2):
    """
    Calculate distance between two points in miles
    """
    R = 3959.0  # Earth's radius in miles
    
    lat1_rad = math.radians(lat1)
    lng1_rad = math.radians(lng1)
    lat2_rad = math.radians(lat2)
    lng2_rad = math.radians(lng2)
    
    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad
    
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * 
         math.sin(dlng / 2) ** 2)
    
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c
```

---

## Google Places API Integration

### API Key Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project "Itinerai"
3. Enable APIs:
   - Places API
   - Maps JavaScript API
   - Geocoding API
4. Create API key (restrict to HTTP referrers for production)

### API Calls Needed

#### 1. Nearby Search
```python
import googlemaps

gmaps = googlemaps.Client(key='YOUR_API_KEY')

# Search for places near coordinates
results = gmaps.places_nearby(
    location=(37.7749, -122.4194),  # (lat, lng)
    radius=8046,                     # meters (5 miles)
    type='tourist_attraction',       # or 'restaurant', 'museum', etc.
    rank_by='prominence'             # or 'distance'
)

# Returns up to 20 results per request
# Can paginate with next_page_token for more
```

#### 2. Place Details
```python
# Get detailed info about a specific place
details = gmaps.place(
    place_id='ChIJN1t_tDeuEmsRUsoyG83frY4',
    fields=[
        'name', 'place_id', 'geometry', 'rating',
        'user_ratings_total', 'price_level', 'types',
        'opening_hours', 'formatted_address', 'photos',
        'website', 'formatted_phone_number'
    ]
)

result = details['result']
```

#### 3. Photo Reference to URL
```python
# Convert photo reference to URL
def get_photo_url(photo_reference, max_width=400):
    return f"https://maps.googleapis.com/maps/api/place/photo?maxwidth={max_width}&photoreference={photo_reference}&key={API_KEY}"
```

### Activity Type Mapping
```python
ACTIVITY_TYPE_MAPPING = {
    'nature': ['park', 'natural_feature', 'campground', 'hiking_area'],
    'food': ['restaurant', 'cafe', 'bakery', 'bar', 'meal_takeaway'],
    'culture': ['museum', 'art_gallery', 'library', 'landmark', 'church'],
    'entertainment': ['movie_theater', 'amusement_park', 'zoo', 'aquarium', 
                     'bowling_alley', 'night_club'],
    'shopping': ['shopping_mall', 'store', 'clothing_store', 'book_store']
}
```

### Caching Strategy
- Cache all Google Places responses in MongoDB
- Cache expiry: 30 days
- Before API call, check `places_cache` collection
- Update `lastUpdated` on each cache hit
- Reduces API costs significantly

---

## Project Directory Structure

```
itinerai/
├── backend/
│   ├── app.py                          # Main Flask application
│   ├── config.py                       # Configuration
│   ├── requirements.txt                # Python dependencies
│   ├── .env                            # Environment variables (DON'T COMMIT)
│   ├── .env.example                    # Example env file
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py                     # User model
│   │   ├── itinerary.py                # Itinerary model
│   │   └── place.py                    # Place model
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── cities.py                   # City endpoints
│   │   ├── itinerary.py                # Itinerary CRUD
│   │   └── recommendations.py          # Recommendation endpoints
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── google_places.py            # Google Places API client
│   │   ├── recommendation_engine.py    # Ranking algorithm
│   │   ├── distance_calculator.py      # Haversine distance
│   │   └── place_repository.py         # Database queries
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── db.py                       # MongoDB connection
│   │   ├── validators.py               # Input validation
│   │   └── constants.py                # Constants (CA cities)
│   │
│   └── scripts/
│       ├── init_mongodb.py             # Create indexes
│       └── seed_data.py                # Seed CA cities
│
└── frontend/
    ├── App.tsx                         # Root component
    ├── app.json                        # Expo configuration
    ├── package.json                    # Dependencies
    ├── tsconfig.json                   # TypeScript config
    ├── .env                            # Environment variables
    ├── .env.example                    # Example env file
    │
    └── src/
        ├── navigation/
        │   └── AppNavigator.tsx        # Navigation setup
        │
        ├── screens/
        │   ├── OnboardingScreen.tsx    # 4-question onboarding
        │   ├── CitySelectionScreen.tsx # Select CA city
        │   ├── InitialSpotsScreen.tsx  # Popular spots
        │   ├── RecommendationsScreen.tsx # Sequential recommendations
        │   └── ItinerarySummaryScreen.tsx # Final itinerary
        │
        ├── components/
        │   ├── PlaceCard.tsx           # Place display card
        │   ├── PlaceList.tsx           # List of places
        │   ├── MapWithMarkers.tsx      # Map with route
        │   └── LoadingSpinner.tsx      # Loading state
        │
        ├── services/
        │   └── api.ts                  # API client
        │
        ├── store/
        │   └── itineraryStore.ts       # Zustand state
        │
        ├── types/
        │   └── index.ts                # TypeScript types
        │
        ├── utils/
        │   └── constants.ts            # Constants
        │
        └── theme/
            ├── index.ts                # Theme configuration
            └── colors.ts               # Color palette
```

---

## Implementation Instructions

### Backend Implementation

#### 1. Setup & Configuration

**File: `backend/requirements.txt`**
```
Flask==3.0.0
flask-cors==4.0.0
pymongo==4.6.1
python-dotenv==1.0.0
requests==2.31.0
googlemaps==4.10.0
python-dateutil==2.8.2
```

**File: `backend/.env.example`**
```bash
# Flask
SECRET_KEY=your-secret-key-change-in-production
FLASK_DEBUG=True

# MongoDB
MONGODB_URI=mongodb://localhost:27017/
DATABASE_NAME=itinerai_db

# Google Places API
GOOGLE_PLACES_API_KEY=your-google-places-api-key-here
```

**File: `backend/config.py`**
```python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    DEBUG = os.getenv('FLASK_DEBUG', 'True') == 'True'
    
    # MongoDB
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
    DATABASE_NAME = os.getenv('DATABASE_NAME', 'itinerai_db')
    
    # Google Places API
    GOOGLE_PLACES_API_KEY = os.getenv('GOOGLE_PLACES_API_KEY')
    
    # App Settings
    MAX_DISTANCE_DEFAULT = 5  # miles
    CACHE_EXPIRY_DAYS = 30
    RESULTS_PER_PAGE = 10
    MAX_RECOMMENDATIONS = 10
```

#### 2. Database Connection

**File: `backend/utils/db.py`**
```python
from pymongo import MongoClient
from config import Config

class Database:
    client = None
    db = None
    
    @classmethod
    def initialize(cls):
        if cls.client is None:
            cls.client = MongoClient(Config.MONGODB_URI)
            cls.db = cls.client[Config.DATABASE_NAME]
            print(f"✅ Connected to MongoDB: {Config.DATABASE_NAME}")
    
    @classmethod
    def get_db(cls):
        if cls.db is None:
            cls.initialize()
        return cls.db

def init_db(app):
    Database.initialize()
    return Database.get_db()
```

#### 3. Constants

**File: `backend/utils/constants.py`**
```python
# California cities for POC
CALIFORNIA_CITIES = [
    {
        'id': 'san-francisco',
        'name': 'San Francisco',
        'coordinates': {'lat': 37.7749, 'lng': -122.4194}
    },
    {
        'id': 'los-angeles',
        'name': 'Los Angeles',
        'coordinates': {'lat': 34.0522, 'lng': -118.2437}
    },
    {
        'id': 'san-diego',
        'name': 'San Diego',
        'coordinates': {'lat': 32.7157, 'lng': -117.1611}
    },
    {
        'id': 'san-jose',
        'name': 'San Jose',
        'coordinates': {'lat': 37.3382, 'lng': -121.8863}
    },
    {
        'id': 'sacramento',
        'name': 'Sacramento',
        'coordinates': {'lat': 38.5816, 'lng': -121.4944}
    }
]

# Activity type to Google Place type mapping
ACTIVITY_TYPE_MAPPING = {
    'nature': ['park', 'natural_feature', 'campground', 'hiking_area'],
    'food': ['restaurant', 'cafe', 'bakery', 'bar', 'meal_takeaway'],
    'culture': ['museum', 'art_gallery', 'library', 'landmark', 'church'],
    'entertainment': ['movie_theater', 'amusement_park', 'zoo', 'aquarium', 
                     'bowling_alley', 'night_club'],
    'shopping': ['shopping_mall', 'store', 'clothing_store', 'book_store']
}

# Budget to price level mapping
BUDGET_TO_PRICE_LEVEL = {
    'budget': (0, 1),       # Free to $
    'moderate': (1, 2),     # $ to $$
    'luxury': (2, 4)        # $$ to $$$$
}
```

#### 4. Distance Calculator

**File: `backend/services/distance_calculator.py`**
```python
import math

class DistanceCalculator:
    EARTH_RADIUS_MILES = 3959.0
    MILES_TO_METERS = 1609.34
    
    @staticmethod
    def haversine_distance(lat1, lng1, lat2, lng2):
        """
        Calculate distance between two points in miles using Haversine formula
        
        Args:
            lat1, lng1: First point coordinates
            lat2, lng2: Second point coordinates
            
        Returns:
            Distance in miles
        """
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lng1_rad = math.radians(lng1)
        lat2_rad = math.radians(lat2)
        lng2_rad = math.radians(lng2)
        
        # Differences
        dlat = lat2_rad - lat1_rad
        dlng = lng2_rad - lng1_rad
        
        # Haversine formula
        a = (math.sin(dlat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * 
             math.sin(dlng / 2) ** 2)
        
        c = 2 * math.asin(math.sqrt(a))
        
        distance = DistanceCalculator.EARTH_RADIUS_MILES * c
        
        return distance
    
    @staticmethod
    def miles_to_meters(miles):
        """Convert miles to meters"""
        return miles * DistanceCalculator.MILES_TO_METERS
    
    @staticmethod
    def meters_to_miles(meters):
        """Convert meters to miles"""
        return meters / DistanceCalculator.MILES_TO_METERS
```

#### 5. Google Places Service

**File: `backend/services/google_places.py`**
```python
import googlemaps
from datetime import datetime
from config import Config
from utils.constants import ACTIVITY_TYPE_MAPPING

class GooglePlacesService:
    def __init__(self):
        self.client = googlemaps.Client(key=Config.GOOGLE_PLACES_API_KEY)
    
    def search_nearby(self, location, radius_meters, activity_types=None):
        """
        Search for places near a location
        
        Args:
            location: dict with 'lat' and 'lng'
            radius_meters: search radius in meters
            activity_types: list of activity types (e.g., ['nature', 'food'])
            
        Returns:
            List of places
        """
        # Convert activity types to Google types
        google_types = self._convert_to_google_types(activity_types) if activity_types else ['tourist_attraction']
        
        all_places = []
        
        for place_type in google_types:
            try:
                results = self.client.places_nearby(
                    location=(location['lat'], location['lng']),
                    radius=radius_meters,
                    type=place_type,
                    rank_by='prominence'
                )
                
                for place in results.get('results', []):
                    place_data = self._format_place_data(place)
                    if place_data:
                        all_places.append(place_data)
                        
            except Exception as e:
                print(f"Error fetching places for type {place_type}: {e}")
                continue
        
        # Remove duplicates by place_id
        unique_places = {p['placeId']: p for p in all_places}.values()
        
        return list(unique_places)
    
    def get_place_details(self, place_id):
        """Get detailed information about a specific place"""
        try:
            result = self.client.place(
                place_id=place_id,
                fields=[
                    'name', 'place_id', 'geometry', 'rating',
                    'user_ratings_total', 'price_level', 'types',
                    'opening_hours', 'formatted_address', 'photos',
                    'website', 'formatted_phone_number'
                ]
            )
            
            return self._format_place_data(result.get('result', {}))
            
        except Exception as e:
            print(f"Error getting place details: {e}")
            return None
    
    def _format_place_data(self, place):
        """Format Google Places API response to our schema"""
        try:
            geometry = place.get('geometry', {})
            location = geometry.get('location', {})
            
            return {
                'placeId': place.get('place_id'),
                'name': place.get('name'),
                'location': {
                    'lat': location.get('lat'),
                    'lng': location.get('lng')
                },
                'rating': place.get('rating', 0),
                'userRatingsTotal': place.get('user_ratings_total', 0),
                'priceLevel': place.get('price_level', 2),
                'types': place.get('types', []),
                'address': place.get('formatted_address', ''),
                'photoReference': place.get('photos', [{}])[0].get('photo_reference') if place.get('photos') else None,
                'openingHours': place.get('opening_hours', {}),
                'website': place.get('website'),
                'phoneNumber': place.get('formatted_phone_number')
            }
        except Exception as e:
            print(f"Error formatting place data: {e}")
            return None
    
    def _convert_to_google_types(self, activity_types):
        """Convert user activity types to Google Place types"""
        google_types = []
        
        for activity_type in activity_types:
            google_types.extend(ACTIVITY_TYPE_MAPPING.get(activity_type, []))
        
        # Always include tourist attractions
        google_types.append('tourist_attraction')
        
        return list(set(google_types))  # Remove duplicates
    
    @staticmethod
    def get_photo_url(photo_reference, max_width=400):
        """Convert photo reference to URL"""
        if not photo_reference:
            return None
        return f"https://maps.googleapis.com/maps/api/place/photo?maxwidth={max_width}&photoreference={photo_reference}&key={Config.GOOGLE_PLACES_API_KEY}"
```

#### 6. Place Repository (Database Queries)

**File: `backend/services/place_repository.py`**
```python
from datetime import datetime, timedelta
from pymongo import GEOSPHERE
from utils.db import Database
from services.google_places import GooglePlacesService
from services.distance_calculator import DistanceCalculator
import math

class PlaceRepository:
    def __init__(self):
        self.db = Database.get_db()
        self.places = self.db.places_cache
        self.google_service = GooglePlacesService()
        
        # Ensure indexes exist
        self._ensure_indexes()
    
    def _ensure_indexes(self):
        """Create indexes if they don't exist"""
        self.places.create_index([("location", GEOSPHERE)])
        self.places.create_index([("city", 1), ("popularityScore", -1)])
        self.places.create_index([("placeId", 1)], unique=True)
        self.places.create_index([("types", 1)])
    
    def find_nearby_places(self, longitude, latitude, max_distance_meters, 
                          activity_types=None, min_rating=None):
        """
        Find cached places near coordinates using geospatial index
        Falls back to Google API if cache miss
        """
        query = {
            "location": {
                "$near": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [longitude, latitude]
                    },
                    "$maxDistance": max_distance_meters
                }
            }
        }
        
        if activity_types:
            query["types"] = {"$in": activity_types}
        
        if min_rating:
            query["rating"] = {"$gte": min_rating}
        
        cached_places = list(self.places.find(query).limit(50))
        
        # If not enough cached results, fetch from Google API
        if len(cached_places) < 10:
            google_places = self.google_service.search_nearby(
                location={'lat': latitude, 'lng': longitude},
                radius_meters=max_distance_meters,
                activity_types=activity_types
            )
            
            # Cache the results
            for place in google_places:
                self.cache_place(place, city=None)  # City will be determined
            
            # Re-query from cache
            cached_places = list(self.places.find(query).limit(50))
        
        return cached_places
    
    def get_popular_places_by_city(self, city, limit=20):
        """Get popular tourist spots for a city"""
        places = list(
            self.places.find(
                {"city": city}
            )
            .sort("popularityScore", -1)
            .limit(limit)
        )
        
        # If not enough cached, fetch from Google
        if len(places) < limit:
            from utils.constants import CALIFORNIA_CITIES
            city_data = next((c for c in CALIFORNIA_CITIES if c['id'] == city), None)
            
            if city_data:
                coords = city_data['coordinates']
                google_places = self.google_service.search_nearby(
                    location=coords,
                    radius_meters=16093,  # 10 miles
                    activity_types=None  # Get all types
                )
                
                # Cache results
                for place in google_places:
                    self.cache_place(place, city=city)
                
                # Re-query
                places = list(
                    self.places.find({"city": city})
                    .sort("popularityScore", -1)
                    .limit(limit)
                )
        
        return places
    
    def cache_place(self, place_data, city=None):
        """
        Cache a place from Google Places API
        """
        # Calculate popularity score
        rating = place_data.get('rating', 0)
        reviews = place_data.get('userRatingsTotal', 0)
        popularity_score = (rating * 0.6) + (math.log10(reviews + 1) / 3.0 * 0.4)
        
        # Format for MongoDB
        cache_data = {
            'placeId': place_data['placeId'],
            'city': city,
            'location': {
                'type': 'Point',
                'coordinates': [
                    place_data['location']['lng'],  # longitude first!
                    place_data['location']['lat']
                ]
            },
            'name': place_data['name'],
            'rating': place_data['rating'],
            'userRatingsTotal': place_data['userRatingsTotal'],
            'priceLevel': place_data['priceLevel'],
            'types': place_data['types'],
            'address': place_data.get('address'),
            'photoReference': place_data.get('photoReference'),
            'openingHours': place_data.get('openingHours'),
            'website': place_data.get('website'),
            'phoneNumber': place_data.get('phoneNumber'),
            'popularityScore': popularity_score,
            'lastUpdated': datetime.utcnow()
        }
        
        return self.places.update_one(
            {"placeId": place_data['placeId']},
            {"$set": cache_data},
            upsert=True
        )
    
    def get_place_by_id(self, place_id):
        """Get a single place by place_id"""
        place = self.places.find_one({"placeId": place_id})
        
        # If not cached, fetch from Google
        if not place:
            google_place = self.google_service.get_place_details(place_id)
            if google_place:
                self.cache_place(google_place)
                place = self.places.find_one({"placeId": place_id})
        
        return place
```

#### 7. Recommendation Engine

**File: `backend/services/recommendation_engine.py`**
```python
import math
from typing import List, Dict
from utils.constants import BUDGET_TO_PRICE_LEVEL, ACTIVITY_TYPE_MAPPING
from services.distance_calculator import DistanceCalculator

class RecommendationEngine:
    def __init__(self, user_preferences, current_activities):
        self.budget = user_preferences['budget']
        self.activity_types = user_preferences['activityTypes']
        self.max_distance = user_preferences['maxDistancePerActivity']
        self.current_activities = current_activities
        
        # Ranking weights (must sum to 1.0)
        self.RATING_WEIGHT = 0.30
        self.DISTANCE_WEIGHT = 0.25
        self.TYPE_MATCH_WEIGHT = 0.20
        self.PRICE_WEIGHT = 0.15
        self.POPULARITY_WEIGHT = 0.10
    
    def rank_places(self, places: List[Dict], last_location: Dict) -> List[Dict]:
        """
        Rank places based on weighted scoring algorithm
        
        Args:
            places: List of place dictionaries
            last_location: dict with 'lat' and 'lng'
            
        Returns:
            List of ranked recommendations with scores
        """
        ranked = []
        
        for place in places:
            # Skip if already in itinerary
            if self._already_visited(place):
                continue
            
            # Calculate component scores
            rating_score = self._calculate_rating_score(place)
            distance_score = self._calculate_distance_score(place, last_location)
            type_match_score = self._calculate_type_match_score(place)
            price_score = self._calculate_price_score(place)
            popularity_score = self._calculate_popularity_score(place)
            
            # Weighted total score
            total_score = (
                self.RATING_WEIGHT * rating_score +
                self.DISTANCE_WEIGHT * distance_score +
                self.TYPE_MATCH_WEIGHT * type_match_score +
                self.PRICE_WEIGHT * price_score +
                self.POPULARITY_WEIGHT * popularity_score
            )
            
            # Calculate actual distance for display
            actual_distance = DistanceCalculator.haversine_distance(
                last_location['lat'], last_location['lng'],
                place['location']['coordinates'][1],  # lat
                place['location']['coordinates'][0]   # lng
            )
            
            ranked.append({
                'place': place,
                'score': total_score,
                'distance': actual_distance,
                'scoreBreakdown': {
                    'rating': rating_score,
                    'distance': distance_score,
                    'typeMatch': type_match_score,
                    'price': price_score,
                    'popularity': popularity_score
                }
            })
        
        # Sort by score (highest first)
        return sorted(ranked, key=lambda x: x['score'], reverse=True)
    
    def _calculate_rating_score(self, place: Dict) -> float:
        """Normalize rating to 0-1 scale"""
        rating = place.get('rating', 0)
        return rating / 5.0 if rating else 0.5
    
    def _calculate_distance_score(self, place: Dict, last_location: Dict) -> float:
        """Score based on distance from last location"""
        distance = DistanceCalculator.haversine_distance(
            last_location['lat'], last_location['lng'],
            place['location']['coordinates'][1],  # lat
            place['location']['coordinates'][0]   # lng
        )
        
        if distance > self.max_distance:
            return 0.0  # Heavy penalty
        
        # Linear decay: closer = higher score
        return 1.0 - (distance / self.max_distance)
    
    def _calculate_type_match_score(self, place: Dict) -> float:
        """Score based on activity type match"""
        place_types = set(place.get('types', []))
        preferred_types = self._expand_activity_types(self.activity_types)
        
        if not preferred_types:
            return 0.5
        
        matches = place_types.intersection(preferred_types)
        return len(matches) / len(preferred_types)
    
    def _calculate_price_score(self, place: Dict) -> float:
        """Score based on price level match with budget"""
        price_level = place.get('priceLevel', 2)
        min_price, max_price = BUDGET_TO_PRICE_LEVEL.get(self.budget, (1, 2))
        
        if min_price <= price_level <= max_price:
            return 1.0
        
        distance_from_range = min(
            abs(price_level - min_price),
            abs(price_level - max_price)
        )
        
        return max(0, 1.0 - (distance_from_range * 0.25))
    
    def _calculate_popularity_score(self, place: Dict) -> float:
        """Score based on number of reviews"""
        reviews = place.get('userRatingsTotal', 0)
        
        if reviews == 0:
            return 0.3
        
        # Logarithmic scale (1000+ reviews = 1.0)
        return min(1.0, math.log10(reviews + 1) / 3.0)
    
    def _already_visited(self, place: Dict) -> bool:
        """Check if place is already in itinerary"""
        return any(
            activity['placeId'] == place['placeId']
            for activity in self.current_activities
        )
    
    def _expand_activity_types(self, activity_types: List[str]) -> set:
        """Convert user activity types to Google Place types"""
        expanded = set()
        for activity_type in activity_types:
            expanded.update(ACTIVITY_TYPE_MAPPING.get(activity_type, set()))
        return expanded
```

#### 8. Routes - Cities

**File: `backend/routes/cities.py`**
```python
from flask import Blueprint, jsonify
from utils.constants import CALIFORNIA_CITIES

cities_bp = Blueprint('cities', __name__)

@cities_bp.route('/api/cities', methods=['GET'])
def get_cities():
    """
    Get list of supported California cities
    """
    return jsonify({
        'cities': CALIFORNIA_CITIES
    }), 200
```

#### 9. Routes - Itinerary

**File: `backend/routes/itinerary.py`**
```python
from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime
from utils.db import Database
from services.place_repository import PlaceRepository

itinerary_bp = Blueprint('itinerary', __name__)

@itinerary_bp.route('/api/itinerary', methods=['POST'])
def create_itinerary():
    """Create new itinerary with onboarding preferences"""
    try:
        data = request.json
        
        # Validate required fields
        if not data.get('city') or not data.get('preferences'):
            return jsonify({'error': 'Missing required fields'}), 400
        
        db = Database.get_db()
        itineraries = db.itineraries
        
        # Create itinerary document
        itinerary = {
            'userId': None,  # TODO: Add user authentication
            'city': data['city'],
            'activities': [],
            'preferences': {
                'budget': data['preferences'].get('budget', 'moderate'),
                'activityTypes': data['preferences'].get('activityTypes', []),
                'maxDistancePerActivity': data['preferences'].get('maxDistancePerActivity', 5)
            },
            'totalDistance': 0,
            'estimatedTotalTime': 0,
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }
        
        result = itineraries.insert_one(itinerary)
        itinerary['_id'] = str(result.inserted_id)
        
        return jsonify({
            'itinerary': _format_itinerary(itinerary)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@itinerary_bp.route('/api/itinerary/<itinerary_id>', methods=['GET'])
def get_itinerary(itinerary_id):
    """Get itinerary details"""
    try:
        db = Database.get_db()
        itineraries = db.itineraries
        
        itinerary = itineraries.find_one({'_id': ObjectId(itinerary_id)})
        
        if not itinerary:
            return jsonify({'error': 'Itinerary not found'}), 404
        
        return jsonify({
            'itinerary': _format_itinerary(itinerary)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@itinerary_bp.route('/api/itinerary/<itinerary_id>/add-activity', methods=['POST'])
def add_activity(itinerary_id):
    """Add activity to itinerary"""
    try:
        data = request.json
        place_id = data.get('placeId')
        
        if not place_id:
            return jsonify({'error': 'placeId required'}), 400
        
        db = Database.get_db()
        itineraries = db.itineraries
        place_repo = PlaceRepository()
        
        # Get itinerary
        itinerary = itineraries.find_one({'_id': ObjectId(itinerary_id)})
        if not itinerary:
            return jsonify({'error': 'Itinerary not found'}), 404
        
        # Get place details
        place = place_repo.get_place_by_id(place_id)
        if not place:
            return jsonify({'error': 'Place not found'}), 404
        
        # Create activity
        activity = {
            'placeId': place['placeId'],
            'name': place['name'],
            'rating': place['rating'],
            'userRatingsTotal': place['userRatingsTotal'],
            'priceLevel': place['priceLevel'],
            'types': place['types'],
            'location': {
                'lat': place['location']['coordinates'][1],
                'lng': place['location']['coordinates'][0]
            },
            'address': place.get('address'),
            'photoReference': place.get('photoReference'),
            'order': len(itinerary['activities']) + 1,
            'estimatedDuration': 60  # Default 60 minutes
        }
        
        # Update itinerary
        itineraries.update_one(
            {'_id': ObjectId(itinerary_id)},
            {
                '$push': {'activities': activity},
                '$set': {'updatedAt': datetime.utcnow()}
            }
        )
        
        # Get updated itinerary
        updated_itinerary = itineraries.find_one({'_id': ObjectId(itinerary_id)})
        
        return jsonify({
            'itinerary': _format_itinerary(updated_itinerary),
            'message': 'Activity added successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@itinerary_bp.route('/api/itinerary/<itinerary_id>/remove-activity/<place_id>', methods=['DELETE'])
def remove_activity(itinerary_id, place_id):
    """Remove activity from itinerary"""
    try:
        db = Database.get_db()
        itineraries = db.itineraries
        
        # Remove activity and re-order
        itineraries.update_one(
            {'_id': ObjectId(itinerary_id)},
            {
                '$pull': {'activities': {'placeId': place_id}},
                '$set': {'updatedAt': datetime.utcnow()}
            }
        )
        
        # Re-order remaining activities
        itinerary = itineraries.find_one({'_id': ObjectId(itinerary_id)})
        for i, activity in enumerate(itinerary['activities']):
            activity['order'] = i + 1
        
        itineraries.update_one(
            {'_id': ObjectId(itinerary_id)},
            {'$set': {'activities': itinerary['activities']}}
        )
        
        updated_itinerary = itineraries.find_one({'_id': ObjectId(itinerary_id)})
        
        return jsonify({
            'itinerary': _format_itinerary(updated_itinerary),
            'message': 'Activity removed successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _format_itinerary(itinerary):
    """Format itinerary for JSON response"""
    itinerary['_id'] = str(itinerary['_id'])
    return itinerary
```

#### 10. Routes - Recommendations

**File: `backend/routes/recommendations.py`**
```python
from flask import Blueprint, request, jsonify
from bson import ObjectId
import random
from utils.db import Database
from services.place_repository import PlaceRepository
from services.recommendation_engine import RecommendationEngine
from services.distance_calculator import DistanceCalculator
from config import Config

recommendations_bp = Blueprint('recommendations', __name__)

@recommendations_bp.route('/api/itinerary/<itinerary_id>/initial-spots', methods=['GET'])
def get_initial_spots(itinerary_id):
    """Get popular tourist spots for city (baseline ranking)"""
    try:
        db = Database.get_db()
        itineraries = db.itineraries
        
        itinerary = itineraries.find_one({'_id': ObjectId(itinerary_id)})
        if not itinerary:
            return jsonify({'error': 'Itinerary not found'}), 404
        
        place_repo = PlaceRepository()
        spots = place_repo.get_popular_places_by_city(
            city=itinerary['city'],
            limit=20
        )
        
        # Format for response
        formatted_spots = []
        for spot in spots:
            formatted_spots.append({
                'placeId': spot['placeId'],
                'name': spot['name'],
                'rating': spot['rating'],
                'userRatingsTotal': spot['userRatingsTotal'],
                'priceLevel': spot['priceLevel'],
                'location': {
                    'lat': spot['location']['coordinates'][1],
                    'lng': spot['location']['coordinates'][0]
                },
                'types': spot['types'],
                'photoReference': spot.get('photoReference'),
                'popularityScore': spot.get('popularityScore', 0)
            })
        
        return jsonify({
            'spots': formatted_spots,
            'total': len(formatted_spots)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recommendations_bp.route('/api/itinerary/<itinerary_id>/recommendations', methods=['POST'])
def get_recommendations(itinerary_id):
    """Get next activity recommendations based on last location"""
    try:
        db = Database.get_db()
        itineraries = db.itineraries
        
        itinerary = itineraries.find_one({'_id': ObjectId(itinerary_id)})
        if not itinerary:
            return jsonify({'error': 'Itinerary not found'}), 404
        
        # Get last activity
        if not itinerary['activities']:
            return jsonify({'error': 'No activities in itinerary. Use /initial-spots first'}), 400
        
        last_activity = itinerary['activities'][-1]
        last_location = last_activity['location']
        
        # Get user preferences
        preferences = itinerary['preferences']
        
        # Search for nearby places
        place_repo = PlaceRepository()
        max_distance_meters = DistanceCalculator.miles_to_meters(
            preferences['maxDistancePerActivity']
        )
        
        nearby_places = place_repo.find_nearby_places(
            longitude=last_location['lng'],
            latitude=last_location['lat'],
            max_distance_meters=max_distance_meters,
            activity_types=None  # Recommender will filter
        )
        
        # Rank places
        recommender = RecommendationEngine(preferences, itinerary['activities'])
        recommendations = recommender.rank_places(
            nearby_places,
            last_location=last_location
        )
        
        # Format recommendations
        formatted_recommendations = []
        for rec in recommendations[:Config.MAX_RECOMMENDATIONS]:
            place = rec['place']
            formatted_recommendations.append({
                'place': {
                    'placeId': place['placeId'],
                    'name': place['name'],
                    'rating': place['rating'],
                    'userRatingsTotal': place['userRatingsTotal'],
                    'priceLevel': place['priceLevel'],
                    'location': {
                        'lat': place['location']['coordinates'][1],
                        'lng': place['location']['coordinates'][0]
                    },
                    'types': place['types'],
                    'photoReference': place.get('photoReference'),
                    'address': place.get('address')
                },
                'score': rec['score'],
                'distance': rec['distance'],
                'scoreBreakdown': rec['scoreBreakdown']
            })
        
        return jsonify({
            'recommendations': formatted_recommendations,
            'lastActivity': last_activity,
            'searchCenter': last_location,
            'searchRadius': preferences['maxDistancePerActivity']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recommendations_bp.route('/api/itinerary/<itinerary_id>/shuffle', methods=['POST'])
def shuffle_recommendations(itinerary_id):
    """Shuffle current recommendations by adding randomness"""
    try:
        # Get current recommendations
        db = Database.get_db()
        itineraries = db.itineraries
        
        itinerary = itineraries.find_one({'_id': ObjectId(itinerary_id)})
        if not itinerary or not itinerary['activities']:
            return jsonify({'error': 'No activities to base recommendations on'}), 400
        
        last_activity = itinerary['activities'][-1]
        preferences = itinerary['preferences']
        
        # Get nearby places
        place_repo = PlaceRepository()
        max_distance_meters = DistanceCalculator.miles_to_meters(
            preferences['maxDistancePerActivity']
        )
        
        nearby_places = place_repo.find_nearby_places(
            longitude=last_activity['location']['lng'],
            latitude=last_activity['location']['lat'],
            max_distance_meters=max_distance_meters
        )
        
        # Rank with random noise
        recommender = RecommendationEngine(preferences, itinerary['activities'])
        recommendations = recommender.rank_places(
            nearby_places,
            last_location=last_activity['location']
        )
        
        # Add randomness to scores
        for rec in recommendations:
            rec['score'] += random.uniform(-0.15, 0.15)
        
        # Re-sort
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        # Format
        formatted = []
        for rec in recommendations[:Config.MAX_RECOMMENDATIONS]:
            place = rec['place']
            formatted.append({
                'place': {
                    'placeId': place['placeId'],
                    'name': place['name'],
                    'rating': place['rating'],
                    'location': {
                        'lat': place['location']['coordinates'][1],
                        'lng': place['location']['coordinates'][0]
                    },
                    'types': place['types'],
                    'photoReference': place.get('photoReference')
                },
                'score': rec['score'],
                'distance': rec['distance']
            })
        
        return jsonify({
            'recommendations': formatted
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recommendations_bp.route('/api/itinerary/<itinerary_id>/expand-radius', methods=['POST'])
def expand_search_radius(itinerary_id):
    """Expand search radius by 50%"""
    try:
        db = Database.get_db()
        itineraries = db.itineraries
        
        itinerary = itineraries.find_one({'_id': ObjectId(itinerary_id)})
        if not itinerary or not itinerary['activities']:
            return jsonify({'error': 'No activities to base recommendations on'}), 400
        
        last_activity = itinerary['activities'][-1]
        preferences = itinerary['preferences']
        
        # Expand radius by 50%
        expanded_radius = preferences['maxDistancePerActivity'] * 1.5
        max_distance_meters = DistanceCalculator.miles_to_meters(expanded_radius)
        
        # Search with expanded radius
        place_repo = PlaceRepository()
        nearby_places = place_repo.find_nearby_places(
            longitude=last_activity['location']['lng'],
            latitude=last_activity['location']['lat'],
            max_distance_meters=max_distance_meters
        )
        
        # Rank
        recommender = RecommendationEngine(preferences, itinerary['activities'])
        recommendations = recommender.rank_places(
            nearby_places,
            last_location=last_activity['location']
        )
        
        # Format
        formatted = []
        for rec in recommendations[:Config.MAX_RECOMMENDATIONS]:
            place = rec['place']
            formatted.append({
                'place': {
                    'placeId': place['placeId'],
                    'name': place['name'],
                    'rating': place['rating'],
                    'location': {
                        'lat': place['location']['coordinates'][1],
                        'lng': place['location']['coordinates'][0]
                    },
                    'types': place['types'],
                    'photoReference': place.get('photoReference')
                },
                'score': rec['score'],
                'distance': rec['distance']
            })
        
        return jsonify({
            'recommendations': formatted,
            'newRadius': expanded_radius
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

#### 11. Main Application

**File: `backend/app.py`**
```python
from flask import Flask
from flask_cors import CORS
from config import Config
from utils.db import init_db
from routes.cities import cities_bp
from routes.itinerary import itinerary_bp
from routes.recommendations import recommendations_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for all routes
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Initialize database
    init_db(app)
    
    # Register blueprints
    app.register_blueprint(cities_bp)
    app.register_blueprint(itinerary_bp)
    app.register_blueprint(recommendations_bp)
    
    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health_check():
        return {'status': 'healthy', 'message': 'Itiner.ai API is running'}, 200
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=Config.DEBUG
    )
```

#### 12. Database Initialization Script

**File: `backend/scripts/init_mongodb.py`**
```python
from pymongo import MongoClient, GEOSPHERE, ASCENDING, DESCENDING
import sys
import os

# Add parent directory to path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import Config

def setup_database():
    """Initialize MongoDB with proper indexes"""
    print("🚀 Initializing MongoDB...")
    
    client = MongoClient(Config.MONGODB_URI)
    db = client[Config.DATABASE_NAME]
    
    print("\n📍 Creating indexes for places_cache collection...")
    
    # Geospatial index (CRITICAL for location queries)
    db.places_cache.create_index(
        [("location", GEOSPHERE)],
        name="location_2dsphere"
    )
    print("  ✅ Created geospatial index on location")
    
    # City + popularity index
    db.places_cache.create_index(
        [("city", ASCENDING), ("popularityScore", DESCENDING)],
        name="city_popularity"
    )
    print("  ✅ Created compound index on city + popularityScore")
    
    # Unique placeId index
    db.places_cache.create_index(
        [("placeId", ASCENDING)],
        unique=True,
        name="placeId_unique"
    )
    print("  ✅ Created unique index on placeId")
    
    # Activity types index
    db.places_cache.create_index(
        [("types", ASCENDING)],
        name="types"
    )
    print("  ✅ Created index on types")
    
    # Cache expiration index
    db.places_cache.create_index(
        [("lastUpdated", ASCENDING)],
        name="lastUpdated"
    )
    print("  ✅ Created index on lastUpdated")
    
    print("\n📝 Creating indexes for itineraries collection...")
    
    db.itineraries.create_index(
        [("userId", ASCENDING), ("createdAt", DESCENDING)],
        name="user_itineraries"
    )
    print("  ✅ Created compound index on userId + createdAt")
    
    db.itineraries.create_index(
        [("city", ASCENDING)],
        name="city"
    )
    print("  ✅ Created index on city")
    
    print("\n👤 Creating indexes for users collection...")
    
    db.users.create_index(
        [("email", ASCENDING)],
        unique=True,
        name="email_unique"
    )
    print("  ✅ Created unique index on email")
    
    print("\n🎉 All indexes created successfully!")
    
    # Print summary
    print("\n📋 Index Summary:")
    for collection_name in ['places_cache', 'itineraries', 'users']:
        indexes = db[collection_name].index_information()
        print(f"\n{collection_name}:")
        for index_name, index_info in indexes.items():
            print(f"  - {index_name}: {index_info['key']}")
    
    print("\n✨ Database initialization complete!")

if __name__ == "__main__":
    setup_database()
```

---

### Frontend Implementation

#### 1. Configuration Files

**File: `frontend/package.json`**
```json
{
  "name": "itinerai-app",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~50.0.0",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "react-native-paper": "^5.11.0",
    "react-native-maps": "1.10.0",
    "@expo/vector-icons": "^14.0.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "react-native-screens": "~3.29.0",
    "react-native-safe-area-context": "4.8.2",
    "zustand": "^4.4.7",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "typescript": "^5.1.3"
  }
}
```

**File: `frontend/.env.example`**
```bash
API_BASE_URL=http://localhost:5000/api
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

**File: `frontend/tsconfig.json`**
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

#### 2. Types

**File: `frontend/src/types/index.ts`**
```typescript
export interface Location {
  lat: number;
  lng: number;
}

export interface UserPreferences {
  budget: 'budget' | 'moderate' | 'luxury';
  activityTypes: string[];
  maxDistancePerActivity: number;
}

export interface Place {
  placeId: string;
  name: string;
  rating: number;
  userRatingsTotal: number;
  priceLevel: number;
  location: Location;
  types: string[];
  photoReference?: string;
  address?: string;
}

export interface Activity extends Place {
  order: number;
  estimatedDuration: number;
}

export interface Itinerary {
  _id: string;
  city: string;
  activities: Activity[];
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface Recommendation {
  place: Place;
  score: number;
  distance: number;
  scoreBreakdown: {
    rating: number;
    distance: number;
    typeMatch: number;
    price: number;
    popularity: number;
  };
}

export interface City {
  id: string;
  name: string;
  coordinates: Location;
}
```

#### 3. API Service

**File: `frontend/src/services/api.ts`**
```typescript
import axios from 'axios';
import { Itinerary, UserPreferences, Recommendation, Place, City } from '../types';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const citiesApi = {
  getCities: async (): Promise<City[]> => {
    const response = await api.get('/cities');
    return response.data.cities;
  },
};

export const itineraryApi = {
  create: async (city: string, preferences: UserPreferences): Promise<Itinerary> => {
    const response = await api.post('/itinerary', { city, preferences });
    return response.data.itinerary;
  },

  get: async (id: string): Promise<Itinerary> => {
    const response = await api.get(`/itinerary/${id}`);
    return response.data.itinerary;
  },

  addActivity: async (itineraryId: string, placeId: string): Promise<Itinerary> => {
    const response = await api.post(`/itinerary/${itineraryId}/add-activity`, {
      placeId,
    });
    return response.data.itinerary;
  },

  removeActivity: async (itineraryId: string, placeId: string): Promise<Itinerary> => {
    const response = await api.delete(
      `/itinerary/${itineraryId}/remove-activity/${placeId}`
    );
    return response.data.itinerary;
  },
};

export const recommendationsApi = {
  getInitialSpots: async (itineraryId: string): Promise<Place[]> => {
    const response = await api.get(`/itinerary/${itineraryId}/initial-spots`);
    return response.data.spots;
  },

  getRecommendations: async (itineraryId: string): Promise<Recommendation[]> => {
    const response = await api.post(`/itinerary/${itineraryId}/recommendations`);
    return response.data.recommendations;
  },

  shuffle: async (itineraryId: string): Promise<Recommendation[]> => {
    const response = await api.post(`/itinerary/${itineraryId}/shuffle`);
    return response.data.recommendations;
  },

  expandRadius: async (itineraryId: string): Promise<Recommendation[]> => {
    const response = await api.post(`/itinerary/${itineraryId}/expand-radius`);
    return response.data.recommendations;
  },
};

export const getPhotoUrl = (photoReference: string | undefined): string | undefined => {
  if (!photoReference) return undefined;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`;
};
```

#### 4. Zustand Store

**File: `frontend/src/store/itineraryStore.ts`**
```typescript
import { create } from 'zustand';
import { Itinerary, UserPreferences } from '../types';

interface ItineraryState {
  currentItinerary: Itinerary | null;
  setCurrentItinerary: (itinerary: Itinerary) => void;
  clearItinerary: () => void;
}

export const useItineraryStore = create<ItineraryState>((set) => ({
  currentItinerary: null,
  setCurrentItinerary: (itinerary) => set({ currentItinerary: itinerary }),
  clearItinerary: () => set({ currentItinerary: null }),
}));
```

#### 5. Theme

**File: `frontend/src/theme/index.ts`**
```typescript
import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    secondary: '#03DAC6',
    tertiary: '#FFA726',
    error: '#F44336',
    background: '#FFFFFF',
    surface: '#F5F5F5',
  },
};
```

#### 6. Screens

**File: `frontend/src/screens/OnboardingScreen.tsx`**
```typescript
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Button,
  Text,
  TextInput,
  Chip,
  Surface,
  SegmentedButtons,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { itineraryApi } from '../services/api';
import { useItineraryStore } from '../store/itineraryStore';
import { UserPreferences } from '../types';

const ACTIVITY_TYPES = [
  { value: 'nature', label: '🌲 Nature' },
  { value: 'food', label: '🍽️ Food' },
  { value: 'culture', label: '🎨 Culture' },
  { value: 'entertainment', label: '🎭 Entertainment' },
  { value: 'shopping', label: '🛍️ Shopping' },
];

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const setCurrentItinerary = useItineraryStore((state) => state.setCurrentItinerary);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [budget, setBudget] = useState<'budget' | 'moderate' | 'luxury'>('moderate');
  const [maxDistance, setMaxDistance] = useState('5');
  const [loading, setLoading] = useState(false);

  const toggleActivityType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleContinue = async () => {
    if (selectedTypes.length === 0) {
      alert('Please select at least one activity type');
      return;
    }

    const preferences: UserPreferences = {
      budget,
      activityTypes: selectedTypes,
      maxDistancePerActivity: parseFloat(maxDistance) || 5,
    };

    setLoading(true);
    try {
      // For now, we'll navigate to city selection
      // City will be selected in next screen
      navigation.navigate('CitySelection', { preferences });
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.surface}>
        <Text variant="headlineMedium" style={styles.title}>
          Plan Your Trip
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Answer a few questions to get personalized recommendations
        </Text>

        {/* Question 1: Activity Types */}
        <Text variant="titleMedium" style={styles.questionTitle}>
          What activities interest you?
        </Text>
        <View style={styles.chipsContainer}>
          {ACTIVITY_TYPES.map((type) => (
            <Chip
              key={type.value}
              selected={selectedTypes.includes(type.value)}
              onPress={() => toggleActivityType(type.value)}
              style={styles.chip}
            >
              {type.label}
            </Chip>
          ))}
        </View>

        {/* Question 2: Budget */}
        <Text variant="titleMedium" style={styles.questionTitle}>
          What's your budget?
        </Text>
        <SegmentedButtons
          value={budget}
          onValueChange={(value) => setBudget(value as any)}
          buttons={[
            { value: 'budget', label: '$ Budget' },
            { value: 'moderate', label: '$$ Moderate' },
            { value: 'luxury', label: '$$$ Luxury' },
          ]}
          style={styles.segmentedButtons}
        />

        {/* Question 3: Max Distance */}
        <Text variant="titleMedium" style={styles.questionTitle}>
          Max distance between activities (miles)?
        </Text>
        <TextInput
          mode="outlined"
          value={maxDistance}
          onChangeText={setMaxDistance}
          keyboardType="numeric"
          placeholder="5"
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleContinue}
          loading={loading}
          disabled={loading || selectedTypes.length === 0}
          style={styles.button}
        >
          Continue to City Selection
        </Button>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  surface: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    marginBottom: 24,
  },
  questionTitle: {
    marginTop: 16,
    marginBottom: 12,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 24,
    paddingVertical: 6,
  },
});
```

**File: `frontend/src/screens/CitySelectionScreen.tsx`**
```typescript
import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Card, Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { citiesApi, itineraryApi } from '../services/api';
import { useItineraryStore } from '../store/itineraryStore';
import { City } from '../types';

export const CitySelectionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { preferences } = route.params as any;
  const setCurrentItinerary = useItineraryStore((state) => state.setCurrentItinerary);

  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      const citiesData = await citiesApi.getCities();
      setCities(citiesData);
    } catch (error) {
      console.error('Error loading cities:', error);
      alert('Failed to load cities');
    } finally {
      setLoading(false);
    }
  };

  const handleCitySelect = async (city: City) => {
    setSelecting(true);
    try {
      const itinerary = await itineraryApi.create(city.id, preferences);
      setCurrentItinerary(itinerary);
      navigation.navigate('InitialSpots');
    } catch (error) {
      console.error('Error creating itinerary:', error);
      alert('Failed to create itinerary');
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Where do you want to go?
      </Text>
      <FlatList
        data={cities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            onPress={() => handleCitySelect(item)}
            disabled={selecting}
          >
            <Card.Content>
              <Text variant="titleLarge">{item.name}</Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                California
              </Text>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
});
```

**File: `frontend/src/screens/InitialSpotsScreen.tsx`**
```typescript
import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Image } from 'react-native';
import {
  Card,
  Text,
  Chip,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { recommendationsApi, itineraryApi, getPhotoUrl } from '../services/api';
import { useItineraryStore } from '../store/itineraryStore';
import { Place } from '../types';

export const InitialSpotsScreen: React.FC = () => {
  const navigation = useNavigation();
  const currentItinerary = useItineraryStore((state) => state.currentItinerary);
  const setCurrentItinerary = useItineraryStore((state) => state.setCurrentItinerary);

  const [spots, setSpots] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (currentItinerary) {
      loadInitialSpots();
    }
  }, [currentItinerary]);

  const loadInitialSpots = async () => {
    if (!currentItinerary) return;

    try {
      const spotsData = await recommendationsApi.getInitialSpots(currentItinerary._id);
      setSpots(spotsData);
    } catch (error) {
      console.error('Error loading spots:', error);
      alert('Failed to load popular spots');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSpot = async (place: Place) => {
    if (!currentItinerary) return;

    setAdding(true);
    try {
      const updatedItinerary = await itineraryApi.addActivity(
        currentItinerary._id,
        place.placeId
      );
      setCurrentItinerary(updatedItinerary);
      navigation.navigate('Recommendations');
    } catch (error) {
      console.error('Error adding activity:', error);
      alert('Failed to add activity');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Popular Spots in {currentItinerary?.city.replace('-', ' ')}
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Select your first activity
      </Text>

      <FlatList
        data={spots}
        keyExtractor={(item) => item.placeId}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            {item.photoReference && (
              <Card.Cover source={{ uri: getPhotoUrl(item.photoReference) }} />
            )}
            <Card.Content style={styles.cardContent}>
              <Text variant="titleLarge">{item.name}</Text>
              <View style={styles.ratingContainer}>
                <Text>⭐ {item.rating.toFixed(1)}</Text>
                <Text style={styles.reviews}>
                  ({item.userRatingsTotal} reviews)
                </Text>
              </View>
              <View style={styles.typesContainer}>
                {item.types.slice(0, 3).map((type, index) => (
                  <Chip key={index} compact style={styles.typeChip}>
                    {type.replace('_', ' ')}
                  </Chip>
                ))}
              </View>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() => handleSelectSpot(item)}
                disabled={adding}
              >
                Start Here
              </Button>
            </Card.Actions>
          </Card>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  subtitle: {
    color: '#666',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardContent: {
    paddingTop: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  reviews: {
    marginLeft: 8,
    color: '#666',
  },
  typesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  typeChip: {
    height: 28,
  },
});
```

**File: `frontend/src/screens/RecommendationsScreen.tsx`**
```typescript
import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import {
  Card,
  Text,
  Button,
  Chip,
  FAB,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { recommendationsApi, itineraryApi, getPhotoUrl } from '../services/api';
import { useItineraryStore } from '../store/itineraryStore';
import { Recommendation } from '../types';

export const RecommendationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const currentItinerary = useItineraryStore((state) => state.currentItinerary);
  const setCurrentItinerary = useItineraryStore((state) => state.setCurrentItinerary);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (currentItinerary) {
      loadRecommendations();
    }
  }, [currentItinerary]);

  const loadRecommendations = async () => {
    if (!currentItinerary) return;

    setLoading(true);
    try {
      const recs = await recommendationsApi.getRecommendations(currentItinerary._id);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      alert('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleShuffle = async () => {
    if (!currentItinerary) return;

    setLoading(true);
    try {
      const recs = await recommendationsApi.shuffle(currentItinerary._id);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error shuffling:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandRadius = async () => {
    if (!currentItinerary) return;

    setLoading(true);
    try {
      const recs = await recommendationsApi.expandRadius(currentItinerary._id);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error expanding radius:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlace = async (recommendation: Recommendation) => {
    if (!currentItinerary) return;

    setAdding(true);
    try {
      const updatedItinerary = await itineraryApi.addActivity(
        currentItinerary._id,
        recommendation.place.placeId
      );
      setCurrentItinerary(updatedItinerary);
      // Reload recommendations
      loadRecommendations();
    } catch (error) {
      console.error('Error adding activity:', error);
      alert('Failed to add activity');
    } finally {
      setAdding(false);
    }
  };

  const handleFinish = () => {
    navigation.navigate('ItinerarySummary');
  };

  if (loading && recommendations.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium">Next Activity</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {currentItinerary?.activities.length || 0} activities added
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Button mode="outlined" onPress={handleShuffle} disabled={loading}>
          🔀 Shuffle
        </Button>
        <Button mode="outlined" onPress={handleExpandRadius} disabled={loading}>
          🔍 Expand Radius
        </Button>
      </View>

      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.place.placeId}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No recommendations found</Text>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            {item.place.photoReference && (
              <Card.Cover source={{ uri: getPhotoUrl(item.place.photoReference) }} />
            )}
            <Card.Content>
              <Text variant="titleLarge">{item.place.name}</Text>
              <View style={styles.metaRow}>
                <Text>⭐ {item.place.rating.toFixed(1)}</Text>
                <Text style={styles.distance}>
                  📍 {item.distance.toFixed(1)} mi away
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.score}>
                Match Score: {(item.score * 100).toFixed(0)}%
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => handleSelectPlace(item)} disabled={adding}>
                Skip
              </Button>
              <Button
                mode="contained"
                onPress={() => handleSelectPlace(item)}
                disabled={adding}
              >
                Add to Trip
              </Button>
            </Card.Actions>
          </Card>
        )}
      />

      <FAB
        icon="check"
        label="Finish Trip"
        style={styles.fab}
        onPress={handleFinish}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFF',
    elevation: 2,
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  distance: {
    color: '#666',
  },
  score: {
    marginTop: 8,
    color: '#2196F3',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#666',
  },
});
```

**File: `frontend/src/screens/ItinerarySummaryScreen.tsx`**
```typescript
import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Card, Text, Button, Chip } from 'react-native-paper';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { useItineraryStore } from '../store/itineraryStore';

export const ItinerarySummaryScreen: React.FC = () => {
  const navigation = useNavigation();
  const currentItinerary = useItineraryStore((state) => state.currentItinerary);

  if (!currentItinerary || currentItinerary.activities.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text>No itinerary found</Text>
        <Button onPress={() => navigation.navigate('Onboarding')}>
          Start New Trip
        </Button>
      </View>
    );
  }

  const coordinates = currentItinerary.activities.map((activity) => ({
    latitude: activity.location.lat,
    longitude: activity.location.lng,
  }));

  const region = {
    latitude: coordinates[0].latitude,
    longitude: coordinates[0].longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView style={styles.map} initialRegion={region}>
        {currentItinerary.activities.map((activity, index) => (
          <Marker
            key={activity.placeId}
            coordinate={{
              latitude: activity.location.lat,
              longitude: activity.location.lng,
            }}
            title={activity.name}
            description={`Stop ${index + 1}`}
          >
            <View style={styles.markerContainer}>
              <Text style={styles.markerText}>{index + 1}</Text>
            </View>
          </Marker>
        ))}
        <Polyline
          coordinates={coordinates}
          strokeColor="#2196F3"
          strokeWidth={3}
        />
      </MapView>

      {/* Activities List */}
      <View style={styles.listContainer}>
        <Text variant="headlineSmall" style={styles.title}>
          Your Itinerary ({currentItinerary.activities.length} stops)
        </Text>
        <FlatList
          data={currentItinerary.activities}
          keyExtractor={(item) => item.placeId}
          renderItem={({ item, index }) => (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Chip>{index + 1}</Chip>
                  <Text variant="titleMedium" style={styles.activityName}>
                    {item.name}
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.rating}>
                  ⭐ {item.rating.toFixed(1)}
                </Text>
                <Text variant="bodySmall" style={styles.address}>
                  {item.address}
                </Text>
              </Card.Content>
            </Card>
          )}
        />
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Onboarding')}
          style={styles.button}
        >
          Plan Another Trip
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  map: {
    height: '40%',
  },
  markerContainer: {
    backgroundColor: '#2196F3',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityName: {
    flex: 1,
  },
  rating: {
    marginTop: 8,
  },
  address: {
    marginTop: 4,
    color: '#666',
  },
  button: {
    marginTop: 16,
  },
});
```

#### 7. Navigation

**File: `frontend/src/navigation/AppNavigator.tsx`**
```typescript
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { CitySelectionScreen } from '../screens/CitySelectionScreen';
import { InitialSpotsScreen } from '../screens/InitialSpotsScreen';
import { RecommendationsScreen } from '../screens/RecommendationsScreen';
import { ItinerarySummaryScreen } from '../screens/ItinerarySummaryScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{
        headerStyle: { backgroundColor: '#2196F3' },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ title: 'Itiner.ai' }}
      />
      <Stack.Screen
        name="CitySelection"
        component={CitySelectionScreen}
        options={{ title: 'Select City' }}
      />
      <Stack.Screen
        name="InitialSpots"
        component={InitialSpotsScreen}
        options={{ title: 'Popular Spots' }}
      />
      <Stack.Screen
        name="Recommendations"
        component={RecommendationsScreen}
        options={{ title: 'Build Your Trip' }}
      />
      <Stack.Screen
        name="ItinerarySummary"
        component={ItinerarySummaryScreen}
        options={{ title: 'Your Itinerary' }}
      />
    </Stack.Navigator>
  );
}
```

#### 8. Main App

**File: `frontend/App.tsx`**
```typescript
import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
```

---

## Setup & Running Instructions


### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your Google Places API key

# Initialize MongoDB (make sure MongoDB is running)
python scripts/init_mongodb.py

# Run the Flask server
python app.py
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and add API_BASE_URL and Google Maps API key

# Start Expo
npx expo start

# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Scan QR code with Expo Go app for physical device
```

---

## Testing the Application

### Test Flow

1. **Onboarding Screen**
   - Select activity types (e.g., nature, food)
   - Choose budget (moderate)
   - Set max distance (5 miles)

2. **City Selection**
   - Select "San Francisco"

3. **Initial Spots**
   - Browse popular tourist attractions
   - Select "Golden Gate Bridge" as first activity

4. **Recommendations**
   - View nearby recommendations
   - Try shuffle and expand radius features
   - Add 3-5 more activities

5. **Itinerary Summary**
   - View map with route
   - See complete itinerary list

---

## Key Implementation Notes

1. **Geospatial Queries**: Critical for performance. Ensure 2dsphere index exists.

2. **Caching Strategy**: Cache all Google Places responses to minimize API costs.

3. **Error Handling**: All API calls should have try-catch blocks.

4. **Loading States**: Show ActivityIndicator while fetching data.

5. **Navigation**: Use React Navigation's type-safe navigation.

6. **State Management**: Zustand for global itinerary state.

7. **Photo URLs**: Convert Google photo references to URLs using helper function.

8. **Distance Calculations**: Use Haversine formula, not Google Distance Matrix (too expensive).

---

## Future Enhancements (Out of Scope for POC)

- User authentication
- Save/load itineraries
- Real-time booking integration
- Support for multiple days
- Sharing itineraries
- Offline mode
- More cities beyond California
- Custom activity duration
- Time-based scheduling

---

This guide provides everything needed to implement the Itiner.ai travel planner. Start with backend setup, then frontend, and test the complete flow!