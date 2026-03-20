import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getPinsByItinerary, PinData } from '@/lib/api/pins';
import { saveItinerary } from '@/lib/api/itineraries';
import { useUser } from '@clerk/clerk-expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Input } from '@/components/ui/input';
import { ArrowLeftIcon, CheckCircle2Icon, CheckIcon, Loader2, MapIcon, MapPinIcon, PencilIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

export default function ItinerarySummary() {
  const { itineraryId, city, name } = useLocalSearchParams<{ itineraryId: string; city: string; name?: string }>();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = React.useState(false);
  const [itineraryName, setItineraryName] = React.useState(name || `Trip to ${city}`);
  const [isEditing, setIsEditing] = React.useState(false);

  const { data: pins = [], isLoading } = useQuery({
    queryKey: ['pins', itineraryId, user?.id],
    queryFn: () => getPinsByItinerary({ clerkUserId: user!.id, itineraryId }).then((r) => r.pins),
    enabled: !!user?.id && !!itineraryId,
    staleTime: Infinity,
  });

  const sortedPins = React.useMemo(
    () => [...pins].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [pins]
  );

  const totalPlaces = sortedPins.reduce((sum, pin) => sum + pin.places.length, 0);

  // ✅ Compute once
  const markers = React.useMemo(() => getAllMarkers(sortedPins), [sortedPins]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await saveItinerary({
        itineraryId,
        clerkUserId: user.id,
        name: itineraryName,
        city,
        stopCount: sortedPins.length,
      });
      queryClient.invalidateQueries({ queryKey: ['itineraries', user.id] });
      queryClient.invalidateQueries({ queryKey: ['pins', itineraryId, user.id] });
      router.replace('/');
    } catch (err) {
      console.error('Failed to save itinerary:', err);
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-2">
          <View className="animate-spin">
            <Icon as={Loader2} size={32} />
          </View>
          <Text>Loading summary...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4">
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="flex-row items-center gap-1.5 self-start p-2 -ml-2"
          >
            <Icon as={ArrowLeftIcon} className="size-4 text-foreground" />
            <Text className="text-sm font-medium">Back</Text>
          </Pressable>

          <View className="mt-6 gap-1">
            {isEditing ? (
              <View className="flex-row items-center gap-2">
                <Input
                  value={itineraryName}
                  onChangeText={setItineraryName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => setIsEditing(false)}
                  className="flex-1 text-2xl font-bold"
                  style={{ height: 48 }}
                />
                <Button size="icon" onPress={() => setIsEditing(false)}>
                  <Icon as={CheckIcon} className="size-4 text-primary-foreground" />
                </Button>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <Text className="text-2xl font-bold">{itineraryName}</Text>
                <Button size="icon" variant="ghost" onPress={() => setIsEditing(true)}>
                  <Icon as={PencilIcon} className="size-4 text-foreground" />
                </Button>
              </View>
            )}
            <Text className="text-sm text-muted-foreground">
              {sortedPins.length} {sortedPins.length === 1 ? 'stop' : 'stops'} · {totalPlaces}{' '}
              {totalPlaces === 1 ? 'place' : 'places'}
            </Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          className="mt-6 flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-24 gap-6"
        >
          {/* ✅ Map (only show if we have at least 1 marker / pin) */}
          {sortedPins.length > 0 && (
            <View className="overflow-hidden rounded-2xl border border-border bg-card">
              <MapView
                style={{ height: 220, width: '100%' }}
                initialRegion={getInitialRegion(sortedPins)}
                pitchEnabled={false}
                rotateEnabled={false}
                scrollEnabled
                zoomEnabled
              >
                {/* ✅ Route segments in your selected order */}
                {markers.length >= 2 &&
                  markers.slice(0, -1).map((m, idx) => {
                    const next = markers[idx + 1];
                    return (
                      <MapViewDirections
                        key={`dir-${m.key}-${next.key}`}
                        origin={{ latitude: m.latitude, longitude: m.longitude }}
                        destination={{ latitude: next.latitude, longitude: next.longitude }}
                        apikey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY!}
                        mode="WALKING" // or "DRIVING"
                        strokeWidth={4}
                        optimizeWaypoints={false} // keep your order
                        onError={(e) => console.log('Directions error:', e)}
                      />
                    );
                  })}

                {/* ✅ Markers */}
                {markers.map((m, idx) => (
                <Marker
                  key={m.key}
                  coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                  tracksViewChanges={Platform.OS === 'android' ? false : undefined}
                >
                  {/* Numbered badge */}
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-primary border border-border">
                    <Text className="text-xs font-bold text-primary-foreground">{idx + 1}</Text>
                  </View>
                </Marker>
              ))}
              </MapView>
            </View>
          )}
          {sortedPins.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Icon as={MapPinIcon} className="size-8 text-muted-foreground" />
              </View>
              <Text className="mt-4 text-lg font-semibold">No places selected</Text>
              <Text className="mt-2 text-center text-sm text-muted-foreground">
                Go back and select some places for your itinerary
              </Text>
              <Button variant="outline" onPress={() => router.back()} className="mt-6">
                <Icon as={ArrowLeftIcon} className="size-4" />
                <Text>Go Back</Text>
              </Button>
            </View>
          ) : (
            sortedPins.map((pin, pinIndex) => {
              const placeStartIndex = sortedPins
                .slice(0, pinIndex)
                .reduce((sum, p) => sum + p.places.length, 0);
              return (
                <StopSection
                  key={pin.pin_id}
                  pin={pin}
                  stopNumber={pinIndex + 1}
                  placeStartIndex={placeStartIndex}
                />
              );
            })
          )}
        </ScrollView>

        {sortedPins.length > 0 && (
          <View className="px-6 pb-6 pt-4 gap-3">
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onPress={() =>
                router.push({
                  pathname: '/(create-itinerary)/step5',
                  params: { selectedCity: city, itineraryId, hideModal: 'true' },
                })
              }>
              <Icon as={MapIcon} className="size-4 text-foreground" />
              <Text>Edit Places</Text>
            </Button>
            <Button size="lg" onPress={handleSave} disabled={isSaving} className="w-full">
              <Icon
                as={isSaving ? Loader2 : MapPinIcon}
                className="size-4 text-primary-foreground"
              />
              <Text>{isSaving ? 'Saving...' : 'Save Itinerary'}</Text>
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function StopSection({ pin, stopNumber, placeStartIndex }: { pin: PinData; stopNumber: number; placeStartIndex: number }) {
  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold">Stop {stopNumber}</Text>

      {pin.places.map((place, i) => (
        <View
          key={`${place.name}-${i}`}
          className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <View className="h-7 w-7 items-center justify-center rounded-full bg-primary border border-border shrink-0">
            <Text className="text-xs font-bold text-primary-foreground">{placeStartIndex + i + 1}</Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-medium">{place.name}</Text>
            {place.address ? <Text className="text-sm text-muted-foreground">{place.address}</Text> : null}
            {place.tag ? <Text className="text-xs text-muted-foreground">{place.tag}</Text> : null}
          </View>
          <Icon as={CheckCircle2Icon} className="size-5 text-primary" />
        </View>
      ))}
    </View>
  );
}

function getAllMarkers(pins: PinData[]) {
  const markers: Array<{
    key: string;
    latitude: number;
    longitude: number;
    title: string;
    description?: string;
  }> = [];

  pins.forEach((pin, pinIndex) => {
    pin.places.forEach((place: any, placeIndex: number) => {
      const latitude = place.latitude ?? place.lat;
      const longitude = place.longitude ?? place.lng;

      if (typeof latitude === 'number' && typeof longitude === 'number') {
        markers.push({
          key: `${pin.pin_id}-${placeIndex}`,
          latitude,
          longitude,
          title: `Stop ${pinIndex + 1}: ${place.name}`,
          description: place.address,
        });
      }
    });
  });

  return markers;
}

function getInitialRegion(pins: PinData[]) {
  const markers = getAllMarkers(pins);

  // Fallback if you don't have coordinates yet
  if (markers.length === 0) {
    return {
      latitude: 37.7749,
      longitude: -122.4194,
      latitudeDelta: 0.25,
      longitudeDelta: 0.25,
    };
  }

  const lats = markers.map((m) => m.latitude);
  const lngs = markers.map((m) => m.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;

  // Padding so pins aren't on the edge
  const latitudeDelta = Math.max(0.02, (maxLat - minLat) * 1.6);
  const longitudeDelta = Math.max(0.02, (maxLng - minLng) * 1.6);

  return { latitude, longitude, latitudeDelta, longitudeDelta };
}