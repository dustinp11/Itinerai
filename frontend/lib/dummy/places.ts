import { type PlacesPayload } from '@/lib/api/places';

const DUMMY_PLACES: PlacesPayload[] = [
  {
    rating: 4.5,
    ratingCount: 1250,
    priceLevel: 2,
    name: "The Lab Anti-Mall",
    openNow: true,
    address: "2930 Bristol St, Costa Mesa, CA 92626",
    score: 8.7
  },
  {
    rating: 4.3,
    ratingCount: 895,
    priceLevel: 3,
    name: "Irvine Spectrum Center",
    openNow: true,
    address: "71 Fortune Dr, Irvine, CA 92618",
    score: 8.9
  },
  {
    rating: 4.6,
    ratingCount: 2103,
    priceLevel: 1,
    name: "William R. Mason Regional Park",
    openNow: true,
    address: "18712 University Dr, Irvine, CA 92612",
    score: 9.1
  },
  {
    rating: 4.4,
    ratingCount: 567,
    priceLevel: 2,
    name: "Pretend City Children's Museum",
    openNow: false,
    address: "29 Hubble, Irvine, CA 92618",
    score: 8.5
  },
  {
    rating: 4.2,
    ratingCount: 1456,
    priceLevel: 2,
    name: "Orange County Great Park",
    openNow: true,
    address: "6950 Marine Way, Irvine, CA 92618",
    score: 8.3
  },
  {
    rating: 4.7,
    ratingCount: 789,
    priceLevel: 3,
    name: "UC Irvine Campus",
    openNow: true,
    address: "Irvine, CA 92697",
    score: 9.2
  }
];

export async function getDummyPlaces(args: {
  city: string;
}): Promise<{ places: PlacesPayload[] }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('Fetching dummy places for city:', args.city);
  
  return { places: DUMMY_PLACES };
}