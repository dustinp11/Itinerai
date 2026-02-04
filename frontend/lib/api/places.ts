import { api } from './client';

export type PlacesPayload = {
  rating: number;
  ratingCount: number;
  priceLevel: number;
  name: string;
  openNow: boolean;
  address: string;
  score: number;
};

export async function getPlaces(args: {
  city: string;
}) {
  console.log('Fetching places for city:', args.city);
  const response = await api.get<PlacesPayload[]>('/search', { city: args.city });
  console.log('Places response:', response);
  return { places: response };
}