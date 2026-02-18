import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { PlaceCard } from '@/components/create-itinerary/place-card';
import { FakeMap } from '@/components/create-itinerary/fake-map';
import { ResizableModal } from '@/components/create-itinerary/resizable-modal';
import { getPlaces } from '@/lib/api/places';
import { getDummyPlaces } from '@/lib/dummy/places';
import { savePin, getPin } from '@/lib/api/pins';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { ArrowRightIcon, Loader2 } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';

import StateAbbrev from '@/assets/us_state_abbrev.json';

type Pin = {
  id: string;
  placeNames: Set<string>;
  isActive: boolean;
  round: number;
};

const SNAP_POINTS = [0.2, 0.8, 0.95];

export default function CreateItineraryStep5() {
  const [pins, setPins] = React.useState<Pin[]>([
    { id: 'pin-0', placeNames: new Set<string>(), isActive: true, round: 0 },
  ]);
  const [selectedPlaces, setSelectedPlaces] = React.useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = React.useState<Set<string>>(new Set());
  const [centerOnLastPin, setCenterOnLastPin] = React.useState(false);
  const [recommendationRound, setRecommendationRound] = React.useState(0);
  const [hideModal, setHideModal] = React.useState(false);
  const [modalSnapPoint, setModalSnapPoint] = React.useState<number | undefined>(undefined);

  const params = useLocalSearchParams<{
    state?: string;
    city?: string;
  }>();

  const state = typeof params.state === 'string' ? params.state : '';
  const city = typeof params.city === 'string' ? params.city : '';
  const stateAbbrev = StateAbbrev[state as keyof typeof StateAbbrev] ?? state;

  const selectedCity = `${city}, ${stateAbbrev}`;
  const { user } = useUser();
  useAuth(); // available for future authenticated requests
  const itineraryId = useRef(`itinerary-${Date.now()}`).current;

  const {
    data: initialPlaces = [],
    isLoading: isLoadingInitial,
    error: initialError,
  } = useQuery({
    queryKey: ['places', selectedCity, user?.id],
    queryFn: async () => {
      const response = await getPlaces({
        city: selectedCity,
        clerkUserId: user?.id,
      });
      return response.places;
    },
    enabled: !!user?.id && recommendationRound === 0,
    staleTime: Infinity,
  });

  const {
    data: dummyPlacesData = [],
    isLoading: isLoadingDummy,
    error: dummyError,
  } = useQuery({
    queryKey: ['dummyPlaces', selectedCity, recommendationRound],
    queryFn: async () => {
      const response = await getDummyPlaces({
        city: selectedCity,
        round: recommendationRound,
      });
      return response.places;
    },
    enabled: recommendationRound > 0,
    staleTime: Infinity,
  });

  const places = recommendationRound > 0 ? dummyPlacesData : initialPlaces;
  const isLoading = isLoadingInitial;
  const error = initialError || dummyError;

  const handleTogglePlaceSelection = useCallback((placeName: string) => {
    setSelectedPlaces((prev) => {
      const next = new Set(prev);
      if (next.has(placeName)) {
        next.delete(placeName);
      } else {
        next.add(placeName);
      }
      return next;
    });
  }, []);

  const handleToggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  }, []);

  const allUniqueTags = useMemo(() => {
    const tagsSet = new Set<string>();
    places.forEach((place) => {
      if (place.tag) {
        tagsSet.add(place.tag);
      }
    });
    return Array.from(tagsSet).sort();
  }, [places]);

  const filteredPlaces = useMemo(() => {
    if (selectedTags.size === 0) {
      return places;
    }
    return places.filter((place) => place.tag && selectedTags.has(place.tag));
  }, [places, selectedTags]);

  const activePinIndex = useMemo(() => pins.findIndex((pin) => pin.isActive), [pins]);

  const handleAddPlacesToCurrentPin = async () => {
    if (activePinIndex === -1) return;
    const pin = pins[activePinIndex];
    setPins((prev) => {
      const updated = [...prev];
      updated[activePinIndex] = { ...updated[activePinIndex], placeNames: new Set(selectedPlaces) };
      return updated;
    });
    setSelectedPlaces(new Set());
    setHideModal(true);

    if (user?.id) {
      savePin({
        pinId: pin.id,
        clerkUserId: user.id,
        itineraryId,
        placeNames: Array.from(selectedPlaces),
        places: places.filter((p) => selectedPlaces.has(p.name)),
      }).catch(console.error);
    }
  };

  const handleAddNewPin = () => {
    const newPinId = `pin-${pins.length}`;
    const nextRound = recommendationRound + 1;
    setPins((prev) => [
      ...prev.map((p) => ({ ...p, isActive: false })),
      { id: newPinId, placeNames: new Set<string>(), isActive: true, round: nextRound },
    ]);
    setSelectedPlaces(new Set());
    setCenterOnLastPin(true);
    setRecommendationRound(nextRound);
    setHideModal(false);
    setModalSnapPoint(0.8);
    setTimeout(() => setModalSnapPoint(undefined), 50);
  };

  const handlePinPress = async (pinId: string) => {
    const localPin = pins.find((p) => p.id === pinId);
    setPins((prev) => prev.map((p) => ({ ...p, isActive: p.id === pinId })));
    if (localPin !== undefined) setRecommendationRound(localPin.round);
    setHideModal(false);
    setModalSnapPoint(0.8);
    setTimeout(() => setModalSnapPoint(undefined), 50);

    // Try to load saved selections from backend; fall back to local state
    try {
      const { pin: saved } = await getPin(pinId);
      setSelectedPlaces(new Set(saved.place_names));
    } catch {
      setSelectedPlaces(new Set(localPin?.placeNames));
    }
  };

  const handleDone = () => {
    router.push({
      pathname: '/(create-itinerary)/summary',
      params: { itineraryId, city: selectedCity },
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-2">
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
      <FakeMap
        pins={pins.map((pin) => ({
          id: pin.id,
          placeCount: pin.placeNames.size,
          isActive: pin.isActive,
        }))}
        onPinPress={handlePinPress}
        onAddNewPress={handleAddNewPin}
        centerOnLastPin={centerOnLastPin}
        onBack={() => router.back()}
        onDone={handleDone}
      />

      <ResizableModal
          snapPoints={SNAP_POINTS}
          defaultSnapPoint={0.8}
          targetSnapPoint={modalSnapPoint}
          visible={!hideModal}>
          <View className="flex-1">
            <View className="px-6 pt-4">
              <Text className="text-2xl font-bold">Recommendations in {selectedCity}</Text>
            </View>

            {allUniqueTags.length > 0 && (
              <View className="mt-4 border-t border-border pt-2">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2 px-6 py-3">
                  <Pressable
                    onPress={() => setSelectedTags(new Set())}
                    className={`flex-row items-center gap-1 rounded-full border px-3 py-1.5 ${
                      selectedTags.size === 0
                        ? 'border-primary bg-primary'
                        : 'border-border bg-background'
                    }`}>
                    <Text
                      className={`text-sm font-medium ${selectedTags.size === 0 ? 'text-primary-foreground' : 'text-foreground'}`}>
                      All
                    </Text>
                  </Pressable>
                  {allUniqueTags.map((tag) => (
                    <Pressable
                      key={tag}
                      onPress={() => handleToggleTag(tag)}
                      className={`flex-row items-center gap-1 rounded-full border px-3 py-1.5 ${
                        selectedTags.has(tag)
                          ? 'border-primary bg-primary'
                          : 'border-border bg-background'
                      }`}>
                      <Text
                        className={`text-sm font-medium ${selectedTags.has(tag) ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {tag}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {isLoadingDummy && (
              <View className="flex-1 items-center justify-center">
                <View className="animate-spin">
                  <Icon as={Loader2} size={32} />
                </View>
                <Text className="mt-2">Loading new recommendations...</Text>
              </View>
            )}

            {!isLoadingDummy && (
              <ScrollView
                className="flex-1 px-6 py-4"
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-24">
                <View className="gap-4">
                  {filteredPlaces.map((place, index) => (
                    <PlaceCard
                      key={`${place.name}-${index}`}
                      name={place.name}
                      address={place.address}
                      priceLevel={place.priceLevel}
                      onAdd={() => handleTogglePlaceSelection(place.name)}
                      isAdded={selectedPlaces.has(place.name)}
                      imageUrl={place.image_url}
                      tag={place.tag}
                    />
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {selectedPlaces.size > 0 && activePinIndex !== -1 && (
            <View className="absolute bottom-0 left-0 right-0 items-center bg-white px-6 pb-6 pt-4 shadow-2xl shadow-black/20">
              <Button className="w-[95%] shadow-md" size="lg" onPress={handleAddPlacesToCurrentPin}>
                <Text>Add ({selectedPlaces.size}) Places</Text>
                <Icon as={ArrowRightIcon} className="ml-1 size-4 text-primary-foreground" />
              </Button>
            </View>
          )}
        </ResizableModal>
    </SafeAreaView>
  );
}
