import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { PlaceCard } from '@/components/create-itinerary/place-card';
import { FakeMap } from '@/components/create-itinerary/fake-map';
import { ResizableModal } from '@/components/create-itinerary/resizable-modal';
import { getPlaces, getNextPlaces, PlacesPayload } from '@/lib/api/places';
import { savePin, getPin, getPinsByItinerary } from '@/lib/api/pins';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { ArrowRightIcon, Loader2 } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import StateAbbrev from '@/assets/us_state_abbrev.json';

function formatType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}


type Pin = {
  id: string;
  serverId?: string; // server-generated UUID, set after first save
  placeNames: Set<string>;
  isActive: boolean;
  round: number;
};

const SNAP_POINTS = [0.2, 0.8, 0.95];
const RECOMMENDED_TAG = '__recommended__';

export default function CreateItineraryStep5() {
  const params = useLocalSearchParams<{
    state?: string;
    city?: string;
    selectedCity?: string;
    itineraryId?: string;
    hideModal?: string;
  }>();

  const [pins, setPins] = React.useState<Pin[]>([
    { id: 'pin-0', placeNames: new Set<string>(), isActive: true, round: 0 },
  ]);
  const [selectedPlaces, setSelectedPlaces] = React.useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = React.useState<Set<string>>(new Set());
  const [centerOnLastPin, setCenterOnLastPin] = React.useState(false);
  const [recommendationRound, setRecommendationRound] = React.useState(0);
  const [anchorPlaces, setAnchorPlaces] = React.useState<PlacesPayload[]>([]);
  const [shownNames, setShownNames] = React.useState<string[]>([]);
  const [hideModal, setHideModal] = React.useState(params.hideModal === 'true');
  const [modalSnapPoint, setModalSnapPoint] = React.useState<number | undefined>(undefined);
  const [anchorSelectedNames, setAnchorSelectedNames] = React.useState<Set<string>>(new Set());
  const [allSelectedNames, setAllSelectedNames] = React.useState<Set<string>>(new Set());

  const state = typeof params.state === 'string' ? params.state : '';
  const city = typeof params.city === 'string' ? params.city : '';
  const stateAbbrev = StateAbbrev[state as keyof typeof StateAbbrev] ?? state;

  const selectedCity = typeof params.selectedCity === 'string'
    ? params.selectedCity
    : `${city}, ${stateAbbrev}`;
  const { user } = useUser();
  useAuth(); // available for future authenticated requests
  const queryClient = useQueryClient();
  const isExistingItinerary = typeof params.itineraryId === 'string';
  const itineraryId = useRef(
    typeof params.itineraryId === 'string' ? params.itineraryId : `itinerary-${Date.now()}`
  ).current;

  const {
    data: existingPinsData,
    isLoading: isLoadingExistingPins,
  } = useQuery({
    queryKey: ['pins', itineraryId, user?.id],
    queryFn: () => getPinsByItinerary({ clerkUserId: user!.id, itineraryId }).then((r) => r.pins),
    enabled: isExistingItinerary && !!user?.id,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!existingPinsData || existingPinsData.length === 0) return;
    const sorted = [...existingPinsData].sort((a, b) => a.created_at.localeCompare(b.created_at));
    setPins(
      sorted.map((pin, index) => ({
        id: `pin-${index}`,
        serverId: pin.pin_id,
        placeNames: new Set(pin.place_names),
        isActive: index === 0,
        round: index,
      }))
    );
    const allNames = new Set(sorted.flatMap((pin) => pin.place_names));
    setAllSelectedNames(allNames);
    setShownNames(Array.from(allNames));
    setSelectedPlaces(new Set(sorted[0].place_names));
    setRecommendationRound(0);
  }, [existingPinsData]);

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
    data: nextPlacesData = [],
    isLoading: isLoadingNext,
    error: nextError,
  } = useQuery({
    queryKey: ['next-places', selectedCity, user?.id, recommendationRound],
    queryFn: () =>
      getNextPlaces({
        selectedPlaces: anchorPlaces,
        city: selectedCity,
        clerkUserId: user?.id,
        excludeNames: shownNames,
      }),
    enabled: recommendationRound > 0 && anchorPlaces.length > 0,
    staleTime: Infinity,
  });

  const places = useMemo(() => {
    if (recommendationRound === 0) return initialPlaces;

    const nextNames = new Set(nextPlacesData.map((p) => p.name));

    const candidates = [
      ...nextPlacesData.filter((p) => !allSelectedNames.has(p.name)),
      ...initialPlaces.filter((p) => !allSelectedNames.has(p.name) && !nextNames.has(p.name)),
    ];

    return candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [recommendationRound, initialPlaces, nextPlacesData, allSelectedNames]);
  const isLoading = isLoadingInitial || (isExistingItinerary && isLoadingExistingPins);
  const error = initialError || nextError;

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
      (place.tags ?? []).forEach((t) => tagsSet.add(t));
    });
    return Array.from(tagsSet).sort();
  }, [places]);

  const hasRecommended = useMemo(() => places.some((p) => p.recommended), [places]);

  const filteredPlaces = useMemo(() => {
    let result = selectedTags.size === 0
      ? places
      : places.filter((place) =>
          (selectedTags.has(RECOMMENDED_TAG) && !!place.recommended) ||
          (place.tags && place.tags.some((t) => selectedTags.has(t)))
        );

    if (anchorSelectedNames.size > 0) {
      result = [...result].sort((a, b) => {
        const aSelected = anchorSelectedNames.has(a.name) ? 0 : 1;
        const bSelected = anchorSelectedNames.has(b.name) ? 0 : 1;
        return aSelected - bSelected;
      });
    }

    return result;
  }, [places, selectedTags, anchorSelectedNames]);

  const activePinIndex = useMemo(() => pins.findIndex((pin) => pin.isActive), [pins]);

const handleAddPlacesToCurrentPin = async () => {
    if (activePinIndex === -1) return;
    const pin = pins[activePinIndex];
    const localId = pin.id;
    const savedPlaceObjects = places.filter((p) => selectedPlaces.has(p.name));
    setAnchorPlaces(savedPlaceObjects);
    setShownNames((prev) => [...new Set([...prev, ...places.map((p) => p.name)])]);
    setPins((prev) => {
      const updated = [...prev];
      updated[activePinIndex] = { ...updated[activePinIndex], placeNames: new Set(selectedPlaces) };
      return updated;
    });
    setAllSelectedNames((prev) => new Set([...prev, ...selectedPlaces]));
    setSelectedPlaces(new Set());
    setAnchorSelectedNames(new Set());
    setHideModal(true);

    if (user?.id) {
      try {
        const { pin: saved } = await savePin({
          pinId: pin?.serverId, 
          clerkUserId: user.id,
          itineraryId,
          placeNames: Array.from(selectedPlaces),
          places: places.filter((p) => selectedPlaces.has(p.name)),
        });
        setPins((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex((p) => p.id === localId);
          if (idx !== -1) updated[idx] = { ...updated[idx], serverId: saved.pin_id };
          return updated;
        });
      } catch (err) {
        console.error(err);
      }
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
    setAnchorSelectedNames(new Set());
    setSelectedTags(new Set());
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
    setSelectedTags(new Set());
    setHideModal(false);
    setModalSnapPoint(0.8);
    setTimeout(() => setModalSnapPoint(undefined), 50);

    // Try to load saved selections from backend; fall back to local state
    if (localPin?.serverId) {
      try {
        const { pin: saved } = await getPin(localPin.serverId);
        const names = new Set(saved.place_names);
        setSelectedPlaces(names);
        setAnchorSelectedNames(names);
      } catch {
        const names = new Set(localPin.placeNames);
        setSelectedPlaces(names);
        setAnchorSelectedNames(names);
      }
    } else {
      const names = new Set(localPin?.placeNames);
      setSelectedPlaces(names);
      setAnchorSelectedNames(names);
    }
  };

  const handleDone = () => {
    queryClient.invalidateQueries({ queryKey: ['pins', itineraryId, user?.id] });
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

            {(allUniqueTags.length > 0 || hasRecommended) && (
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
                  {hasRecommended && (
                    <Pressable
                      onPress={() => handleToggleTag(RECOMMENDED_TAG)}
                      className={`flex-row items-center gap-1 rounded-full border px-3 py-1.5 ${
                        selectedTags.has(RECOMMENDED_TAG)
                          ? 'border-primary bg-primary'
                          : 'border-border bg-background'
                      }`}>
                      <Text
                        className={`text-sm font-medium ${selectedTags.has(RECOMMENDED_TAG) ? 'text-primary-foreground' : 'text-foreground'}`}>
                        Recommended
                      </Text>
                    </Pressable>
                  )}
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
                        {formatType(tag)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {isLoadingNext && recommendationRound > 0 && (
              <View className="flex-1 items-center justify-center">
                <View className="animate-spin">
                  <Icon as={Loader2} size={32} />
                </View>
                <Text className="mt-2">Loading new recommendations...</Text>
              </View>
            )}

            {!(isLoadingNext && recommendationRound > 0) && (
              <ScrollView
                className="flex-1 px-6 py-4"
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-24">
                <View className="gap-4">
                  {filteredPlaces.map((place, index) => {
                    return (
                      <PlaceCard
                        key={`${place.name}-${index}`}
                        name={place.name}
                        address={place.address}
                        priceLevel={place.priceLevel}
                        onAdd={() => handleTogglePlaceSelection(place.name)}
                        isAdded={selectedPlaces.has(place.name)}
                        imageUrl={place.image_url}
                        tags={place.tags}
                        recommended={place.recommended}
                        recommendedReason={place.recommendedReason}
                        rating={place.rating}
                        ratingCount={place.ratingCount}
                        distanceKm={place.distanceKm ?? undefined}
                        score={place.score}
                      />
                    );
                  })}
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
