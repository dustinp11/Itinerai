import { api } from './client';

export type ItineraryData = {
  itinerary_id: string;
  clerk_user_id: string;
  name: string;
  city: string;
  stop_count: number;
  created_at: string;
};

export async function saveItinerary(args: {
  itineraryId: string;
  clerkUserId: string;
  name: string;
  city: string;
  stopCount: number;
}): Promise<{ itinerary: ItineraryData }> {
  return api.post('/itineraries', {
    itineraryId: args.itineraryId,
    clerkUserId: args.clerkUserId,
    name: args.name,
    city: args.city,
    stopCount: args.stopCount,
  });
}

export async function getItineraries(
  clerkUserId: string
): Promise<{ itineraries: ItineraryData[] }> {
  return api.get('/itineraries', { clerkUserId });
}
