import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { getItineraries, ItineraryData } from '@/lib/api/itineraries';
import { useUser } from '@clerk/clerk-expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useFocusEffect } from 'expo-router';
import { MoonStarIcon, PlusIcon, SunIcon, ArrowRightIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_OPTIONS = {
  header: () => (
    <View className="top-safe absolute left-0 right-0 flex-row justify-end px-4 py-2">
      <View className="flex-row items-center gap-2">
        <ThemeToggle />
        <UserMenu />
      </View>
    </View>
  ),
};

export default function Screen() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['itineraries', user?.id] });
    }, [queryClient, user?.id])
  );

  const { data: itineraries = [] } = useQuery({
    queryKey: ['itineraries', user?.id],
    queryFn: () => getItineraries(user!.id).then((r) => r.itineraries),
    enabled: !!user?.id,
  });

  const sortedItineraries = React.useMemo(
    () => [...itineraries].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [itineraries]
  );

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 mt-[120px] pb-8 gap-8"
          showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View className="gap-1">
            <Text className="text-3xl font-bold">
              Welcome, {user?.firstName ?? 'user'}
            </Text>
            <Text className="text-base text-muted-foreground">
              Where do you want to travel today?
            </Text>
          </View>

          {/* Create new button */}
          <Button
            variant="outline"
            className="w-full"
            onPress={() => router.push('/(create-itinerary)/step1')}>
            <Icon as={PlusIcon} className="size-4 text-foreground" />
            <Text>Create new</Text>
          </Button>

          {/* Past Itineraries */}
          {sortedItineraries.length > 0 && (
            <View className="gap-4">
              <Text className="text-xl font-bold">Past Itineraries</Text>
              <View className="gap-3">
                {sortedItineraries.map((itinerary) => (
                  <ItineraryCard key={itinerary.itinerary_id} itinerary={itinerary} />
                ))}
              </View>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function ItineraryCard({ itinerary }: { itinerary: ItineraryData }) {
  return (
    <View className="rounded-2xl border border-border bg-card p-4 gap-3 shadow-sm shadow-black/5">
      <View className="gap-1">
        <Text className="text-base font-bold">{itinerary.name}</Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-muted-foreground">Created {formatDate(itinerary.created_at)}</Text>
          <Text className="text-sm text-muted-foreground">{itinerary.stop_count} {itinerary.stop_count === 1 ? 'Stop' : 'Stops'}</Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold">{itinerary.city}</Text>
        <Button size="sm" onPress={() => router.push({ pathname: '/(create-itinerary)/summary', params: { itineraryId: itinerary.itinerary_id, city: itinerary.city, name: itinerary.name } })}>
          <Text>View</Text>
          <Icon as={ArrowRightIcon} className="size-4 text-primary-foreground" />
        </Button>
      </View>
    </View>
  );
}

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <Button onPress={toggleColorScheme} size="icon" variant="ghost" className="rounded-full">
      <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-6" />
    </Button>
  );
}
