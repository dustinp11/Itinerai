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