import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { PlaceCard } from '@/components/create-itinerary/place-card';
import { getNextPlaces, PlacesPayload } from '@/lib/api/places';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { ArrowLeftIcon, ArrowRightIcon, Loader2 } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NextPlaces() {
  const [addedPlaces, setAddedPlaces] = React.useState<Set<string>>(new Set());

  const params = useLocalSearchParams<{
    selectedPlaces?: string;
    allShownNames?: string;
    city?: string;
  }>();

  const { user } = useUser();

  const initialSelections: PlacesPayload[] = React.useMemo(() => {
    try {
      return params.selectedPlaces ? JSON.parse(params.selectedPlaces) : [];
    } catch {
      return [];
    }
  }, [params.selectedPlaces]);

  const allShownNames: string[] = React.useMemo(() => {
    try {
      return params.allShownNames ? JSON.parse(params.allShownNames) : [];
    } catch {
      return [];
    }
  }, [params.allShownNames]);

  const city = params.city ?? '';

  const {
    data: nextPlaces = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['next-places', city, user?.id, initialSelections.map(p => p.name).join(',')],
    queryFn: () =>
      getNextPlaces({
        selectedPlaces: initialSelections,
        city,
        clerkUserId: user?.id,
        excludeNames: allShownNames,
      }),
    enabled: initialSelections.length > 0,
    staleTime: Infinity,
  });

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
    const initialNames = initialSelections.map(p => p.name);
    const combined = [...initialNames, ...Array.from(addedPlaces)];
    router.push({
      pathname: '/(create-itinerary)/summary',
      params: { selectedPlaces: JSON.stringify(combined) },
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center gap-2 justify-center">
          <View className="animate-spin">
            <Icon as={Loader2} size={32} />
          </View>
          <Text>Finding more places nearby...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text>Error loading suggestions: {(error as Error).message}</Text>
          <Button variant="outline" onPress={onContinue} className="mt-6">
            <Text>Skip and Continue</Text>
          </Button>
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
            <Text className="text-2xl font-bold">More Places Nearby</Text>
            <Text className="text-sm text-muted-foreground">
              Based on your selections — add more or continue to summary
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6 py-4"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-24">
          {nextPlaces.length === 0 ? (
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-muted-foreground">No additional places found nearby.</Text>
            </View>
          ) : (
            <View className="gap-4">
              {nextPlaces.map((place, index) => (
                <PlaceCard
                  key={`${place.name}-${index}`}
                  name={place.name}
                  address={place.address}
                  priceLevel={place.priceLevel}
                  onAdd={() => handleAddPlace(place.name)}
                  isAdded={addedPlaces.has(place.name)}
                  imageUrl={place.image_url}
                  tag={place.tag}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      <View className="absolute bottom-0 left-0 right-0 items-center bg-transparent px-6 pb-6 pt-4 shadow-2xl shadow-black/20">
        <Button className="w-[95%] shadow-md" size="lg" onPress={onContinue}>
          <Text>
            {addedPlaces.size > 0
              ? `Continue with ${initialSelections.length + addedPlaces.size} Places`
              : 'Continue to Summary'}
          </Text>
          <Icon as={ArrowRightIcon} className="ml-1 size-4 text-primary-foreground" />
        </Button>
      </View>
    </SafeAreaView>
  );
}
