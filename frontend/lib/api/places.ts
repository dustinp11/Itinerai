import { api } from './client';

export type PlacesPayload = {
  rating: number;
  ratingCount: number;
  priceLevel: number;
  name: string;
  openNow: boolean;
  address: string;
  score: number;
  tag?: string;
  image_url?: string;
};

export async function getPlaces(args: {
  city: string;
  clerkUserId?: string;
}) {
  console.log('Fetching places for city:', args.city);
  const params: any = { city: args.city };
  if (args.clerkUserId) {
    params.clerkUserId = args.clerkUserId;
  }
  const response = await api.get<PlacesPayload[]>('/search', params);
  console.log('Places response:', response);
  return { places: response };
}

export async function getDummyPlaces(round: number): Promise<{ places: PlacesPayload[] }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return dummy places with round number in the name for variety
  return {
    places: [
      {
        name: `Recommendation ${round} - Cafe A`,
        address: '123 Main St',
        rating: 4.5,
        ratingCount: 120,
        priceLevel: 2,
        openNow: true,
        score: 0.95,
        tag: 'Cafe',
        image_url: undefined,
      },
      {
        name: `Recommendation ${round} - Restaurant B`,
        address: '456 Oak Ave',
        rating: 4.7,
        ratingCount: 200,
        priceLevel: 3,
        openNow: true,
        score: 0.92,
        tag: 'Restaurant',
        image_url: undefined,
      },
      {
        name: `Recommendation ${round} - Museum C`,
        address: '789 Park Blvd',
        rating: 4.3,
        ratingCount: 85,
        priceLevel: 1,
        openNow: true,
        score: 0.88,
        tag: 'Museum',
        image_url: undefined,
      },
      {
        name: `Recommendation ${round} - Bar D`,
        address: '321 Elm St',
        rating: 4.6,
        ratingCount: 150,
        priceLevel: 2,
        openNow: true,
        score: 0.90,
        tag: 'Bar',
        image_url: undefined,
      },
    ],
  };
}