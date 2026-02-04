import { TransportItem } from '@/components/onboarding/transport-item';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BusIcon,
  CarIcon,
  ChevronDownIcon,
  FootprintsIcon,
  PlaneIcon,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { savePreferences } from "@/lib/api/preferences";

const DISTANCE_OPTIONS = ['5 miles', '10 miles', '25 miles', '50 miles', '100 miles', '250+ miles'];

type TransportMode = {
  key: string;
  label: string;
  icon: LucideIcon;
};

const TRANSPORT_MODES: TransportMode[] = [
  { key: 'car', label: 'Car', icon: CarIcon },
  { key: 'walking', label: 'Walking', icon: FootprintsIcon },
  { key: 'public', label: 'Public Transport', icon: BusIcon },
  { key: 'plane', label: 'Plane', icon: PlaneIcon },
];

export default function OnboardingStep3() {
  const { activities, budget } = useLocalSearchParams<{ activities: string; budget: string }>();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [distance, setDistance] = React.useState<string | null>(null);
  const [rankedTransport, setRankedTransport] = React.useState<string[]>([]);

  function toggleTransport(key: string) {
    setRankedTransport((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  }

  function getRank(key: string): number | null {
    const index = rankedTransport.indexOf(key);
    return index === -1 ? null : index + 1;
  }

  function handleDistanceChange(option: any) {
    setDistance(option?.value || null);
  }

  function getCurrentDistanceOption() {
    return distance ? { value: distance, label: distance } : undefined;
  }

  // async function onContinue() {
  //   try {
  //     await user?.update({
  //       unsafeMetadata: {
  //         ...user.unsafeMetadata,
  //         onboardingComplete: true,
  //         preferences: {
  //           activities: activities ? JSON.parse(activities) : [],
  //           budget,
  //           travelDistance: distance,
  //           transportModes: rankedTransport,
  //         },
  //       },
  //     });
  //     router.replace('/');
  //   } catch (err) {
  //     console.error('Failed to save onboarding preferences:', err);
  //   }
  // }
  async function onContinue() {
    if (!user) return;

    const prefs = {
      activities: activities ? JSON.parse(activities) : [],
      budget,
      travelDistance: distance,
      transportModes: rankedTransport,
    };

    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          onboardingComplete: true,
          preferences: prefs,
        },
      });

      const token = await getToken();
      await savePreferences({
        clerkUserId: user.id,
        preferences: prefs,
        token: token ?? undefined,
      });

      router.replace("/");
    } catch (err) {
      console.error("Failed to save onboarding preferences:", err);
    }
  }


  const isValid = distance && rankedTransport.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-4">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5 self-start">
          <Icon as={ArrowLeftIcon} className="size-4 text-foreground" />
          <Text className="text-sm font-medium">Back</Text>
        </Pressable>

        {/* Travel distance section */}
        <View className="mt-10 gap-2">
          <Text className="text-2xl font-bold">How much are you willing to travel?</Text>
          <Text className="text-sm text-muted-foreground">
            So we can recommend the best activities.
          </Text>
        </View>

        <View className="mt-6">
          <Select value={getCurrentDistanceOption()} onValueChange={handleDistanceChange}>
            <SelectTrigger>
              <SelectValue placeholder='Select distance (miles)' />
              </SelectTrigger>
            <SelectContent className="w-[88%]">
              {DISTANCE_OPTIONS.map((option) => (
                <SelectItem
                  key={option}
                  value={option}
                  label={option}
                >
                  <Text>{option}</Text>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>

        {/* Transportation section */}
        <View className="mt-10 gap-2">
          <Text className="text-xl font-bold">
            What's your preferred modes of transportation?
          </Text>
          <Text className="text-sm text-muted-foreground">Rank in order of preference.</Text>
        </View>

        <View className="mt-6 gap-3">
          {TRANSPORT_MODES.map((mode) => (
            <TransportItem
              key={mode.key}
              label={mode.label}
              icon={mode.icon}
              rank={getRank(mode.key)}
              onPress={() => toggleTransport(mode.key)}
            />
          ))}
        </View>
      </View>

      <View className="px-6 pb-6">
        <Button className="w-full" onPress={onContinue} disabled={!isValid}>
          <Text>Continue</Text>
          <Icon as={ArrowRightIcon} className="ml-1 size-4 text-primary-foreground" />
        </Button>
      </View>
    </SafeAreaView>
  );
}
