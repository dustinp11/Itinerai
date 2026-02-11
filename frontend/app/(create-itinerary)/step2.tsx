import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { PlaceCard } from '@/components/create-itinerary/place-card';
import { getPlaces } from '@/lib/api/places';
import { getPreferences } from '@/lib/api/preferences';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { ArrowLeftIcon, ArrowRightIcon, Loader2 } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from "expo-router";

import StateAbbrev from "@/assets/us_state_abbrev.json";



export default function CreateItineraryStep2() {
  const [addedPlaces, setAddedPlaces] = React.useState<Set<string>>(new Set());
  const params = useLocalSearchParams<{
    country?: string;
    state?: string;
    city?: string;
  }>();

  const country = typeof params.country === "string" ? params.country : "United States";
  const state = typeof params.state === "string" ? params.state : "";
  const city = typeof params.city === "string" ? params.city : "";
  const stateAbbrev = StateAbbrev[state] ?? state;

  const selectedCity = `${city}, ${stateAbbrev}`;
  const { user } = useUser();
  const { getToken } = useAuth();

  // using tanstack query for state management and caching of places data
  const {
    data: places = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['places', selectedCity],
    queryFn: async () => {
      const response = await getPlaces({ city: selectedCity });
      return response.places;
    },
    staleTime: Infinity,
  });

  const {
    data: preferences,
    isLoading: isLoadingPreferences,
    error: preferencesError,
  } = useQuery({
    queryKey: ['preferences', user?.id],
    queryFn: async () => {
      const clerkUserId = user?.id || '';
      const token = await getToken();
      console.log('Fetching preferences for user:', clerkUserId);
      const response = await getPreferences({
        clerkUserId,
        token: token ?? undefined,
      });
      console.log('Preferences response:', response);
      return response;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  React.useEffect(() => {
    if (preferences) {
      console.log('Preferences loaded:', preferences);
      console.log('Activities:', preferences?.activities);
    }
    if (preferencesError) {
      console.error('Preferences error:', preferencesError);
    }
  }, [preferences, preferencesError]);

  const handleAddPlace = (placeName: string) => {
    setAddedPlaces((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(placeName)) {
        newSet.delete(placeName);
      } else {
        newSet.add(placeName);
      }
      return newSet;
    });
  };

  const onContinue = () => {
    // Navigate to summary page with selected places
    router.push({
      pathname: '/(create-itinerary)/summary',
      params: { selectedPlaces: JSON.stringify(Array.from(addedPlaces)) },
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center gap-2 justify-center">
          <View className="animate-spin">
            <Icon as={Loader2} size={32} />
          </View>
          <Text>Loading places...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <Text>Error loading places: {(error as Error).message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        <View className="px-6 pt-4">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-1.5 self-start">
            <Icon as={ArrowLeftIcon} className="size-4 text-foreground" />
            <Text className="text-sm font-medium">Back</Text>
          </Pressable>

          <View className="mt-6 gap-1">
            <Text className="text-2xl font-bold">Recommendations in {selectedCity}</Text>
            <Text className="text-sm text-muted-foreground">
              {preferences?.activities && preferences.activities.length > 0
                ? `Recommending places based on your preferences for ${preferences.activities.join(', ')}`
                : 'Recommending places based on your preferences'}
            </Text>
          </View>
        </View>

        <ScrollView
          className="mt-6 flex-1 px-6 py-4"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-24">
          <View className="gap-4">
            {places.map((place, index) => (
              <PlaceCard
                key={`${place.name}-${index}`}
                name={place.name}
                address={place.address}
                priceLevel={place.priceLevel}
                onAdd={() => handleAddPlace(place.name)}
                isAdded={addedPlaces.has(place.name)}
              />
            ))}
          </View>
        </ScrollView>
      </View>
      {addedPlaces.size !== 0 && (
        <View className="absolute bottom-0 left-0 right-0 items-center bg-transparent px-6 pb-6 pt-4 shadow-2xl shadow-black/20">
          <Button className="w-[95%] shadow-md" size="lg" onPress={onContinue}>
            <Text>Add ({addedPlaces.size}) Places</Text>
            <Icon as={ArrowRightIcon} className="ml-1 size-4 text-primary-foreground" />
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}
