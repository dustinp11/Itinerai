import { api } from './client';
import { PlacesPayload } from './places';

export type PinData = {
  pin_id: string;
  clerk_user_id: string;
  itinerary_id: string;
  place_names: string[];
  places: PlacesPayload[];
  created_at: string;
};

export async function savePin(args: {
  pinId: string;
  clerkUserId: string;
  itineraryId: string;
  placeNames: string[];
  places: PlacesPayload[];
}): Promise<{ pin: PinData }> {
  return api.post('/pins', {
    pinId: args.pinId,
    clerkUserId: args.clerkUserId,
    itineraryId: args.itineraryId,
    placeNames: args.placeNames,
    places: args.places,
  });
}

export async function getPin(pinId: string): Promise<{ pin: PinData }> {
  return api.get(`/pins/${pinId}`);
}

export async function getPinsByItinerary(args: {
  clerkUserId: string;
  itineraryId: string;
}): Promise<{ pins: PinData[] }> {
  return api.get('/pins', {
    clerkUserId: args.clerkUserId,
    itineraryId: args.itineraryId,
  });
}

export async function deletePin(pinId: string): Promise<{ ok: boolean }> {
  return api.get(`/pins/${pinId}`);
}
