# Itiner.ai - Travel Itinerary Planner Implementation Guide

## Project Overview

**Itiner.ai** is a context-aware travel itinerary planning application that helps users build personalized multi-stop trips through sequential location recommendations. The app uses Google Places API to suggest activities based on user preferences, budget, and geographic proximity.

**Project Type:** CS 125 - Next Generation Search Systems  
**Team:** Dustin Pham (lead), Karena Tran, Jae Yun Kim  
**Timeline:** 5-week development cycle

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
GOOGLE_API_KEY=YOUR_API_KEY

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
# Edit .env and add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY and EXPO_PUBLIC_API_URL
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:4999

# Start Expo
npx expo start

# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Scan QR code with Expo Go app for physical device