import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftIcon, CheckCircle2Icon, MapPinIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ItinerarySummary() {
  const params = useLocalSearchParams<{ selectedPlaces: string }>();

  const selectedPlaces = React.useMemo(() => {
    try {
      return params.selectedPlaces ? JSON.parse(params.selectedPlaces) : [];
    } catch {
      return [];
    }
  }, [params.selectedPlaces]);

  const handleCreateItinerary = () => {
    // TODO: Call API to create itinerary
    console.log('Creating itinerary with places:', selectedPlaces);
    router.push('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4">
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="flex-row items-center gap-1.5 self-start p-2 -ml-2">
            <Icon as={ArrowLeftIcon} className="size-4 text-foreground" />
            <Text className="text-sm font-medium">Back</Text>
          </Pressable>

          <View className="mt-6 gap-1">
            <Text className="text-3xl font-bold">Itinerary Summary</Text>
            <Text className="text-sm text-muted-foreground">
              Review your selected places
            </Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          className="mt-6 flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-24">
          {/* Places count card */}
          <Card className="mb-6">
            <CardContent className="flex-row items-center gap-3 p-4">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
                <Icon as={MapPinIcon} className="size-6 text-primary-foreground" />
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold">{selectedPlaces.length} Places</Text>
                <Text className="text-sm text-muted-foreground">
                  Added to your itinerary
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Selected places list */}
          <View className="gap-3">
            <Text className="text-lg font-semibold">Selected Places</Text>
            {selectedPlaces.map((placeName: string, index: number) => (
              <Card key={index}>
                <CardContent className="flex-row items-center gap-3 p-4">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Text className="font-semibold text-primary">{index + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium">{placeName}</Text>
                  </View>
                  <Icon as={CheckCircle2Icon} className="size-5 text-primary" />
                </CardContent>
              </Card>
            ))}
          </View>

          {/* Empty state */}
          {selectedPlaces.length === 0 && (
            <View className="flex-1 items-center justify-center py-12">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Icon as={MapPinIcon} className="size-8 text-muted-foreground" />
              </View>
              <Text className="mt-4 text-lg font-semibold">No places selected</Text>
              <Text className="mt-2 text-center text-sm text-muted-foreground">
                Go back and select some places for your itinerary
              </Text>
              <Button
                variant="outline"
                onPress={() => router.back()}
                className="mt-6">
                <Icon as={ArrowLeftIcon} className="size-4" />
                <Text>Go Back</Text>
              </Button>
            </View>
          )}
        </ScrollView>

        {/* Bottom action button */}
        {selectedPlaces.length > 0 && (
          <View className="px-6 pb-6 pt-4">
            <Button
              size="lg"
              onPress={handleCreateItinerary}
              className="w-full">
              <Text>Create Itinerary</Text>
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
