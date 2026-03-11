import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Toggle } from '@/components/ui/toggle';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftIcon, ArrowRightIcon, Circle, CircleCheck } from 'lucide-react-native';
import * as React from 'react';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ACTIVITIES from '@/assets/google_place_types.json';

type ActivityToggleProps = {
  activity: string;
  isSelected: boolean;
  onToggle: (activity: string) => void;
};

const ActivityToggle = memo(function ActivityToggle({
  activity,
  isSelected,
  onToggle,
}: ActivityToggleProps) {
  return (
    <Toggle
      variant="outline"
      pressed={isSelected}
      onPressedChange={() => onToggle(activity)}
      className="rounded-full">
      {isSelected ? (
        <Icon as={CircleCheck} className="size-5 text-foreground" />
      ) : (
        <Icon as={Circle} className="size-5 text-muted-foreground" />
      )}
      <Text>{activity}</Text>
    </Toggle>
  );
});

export default function OnboardingStep1() {
  const { country, state, city } = useLocalSearchParams<{
    country?: string;
    state?: string;
    city?: string;
  }>();
  const [selected, setSelected] = React.useState<string[]>([]);

  const toggleActivity = useCallback((activity: string) => {
    setSelected((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  }, []);

  function onContinue() {
    router.push({
      pathname: '/(create-itinerary)/step3',
      params: { activities: JSON.stringify(selected), country, state, city },
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-4">
        {router.canGoBack() && (
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-1.5 self-start">
            <Icon as={ArrowLeftIcon} className="size-4 text-foreground" />
            <Text className="text-sm font-medium">Back</Text>
          </Pressable>
        )}

        <View className="mb-6 mt-10 gap-2">
          <Text className="text-2xl font-bold">Let's help us get to know you better.</Text>
          <Text className="text-sm text-muted-foreground">
            Select some activities that excite you.
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="mb-10 mt-8 gap-6">
            <View className="flex-row flex-wrap gap-3">
              {Object.keys(ACTIVITIES).map((activity) => (
                <ActivityToggle
                  key={activity}
                  activity={activity}
                  isSelected={selected.includes(activity)}
                  onToggle={toggleActivity}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      <View className="px-6 pb-6">
        <Button className="mt-6 w-full" onPress={onContinue} disabled={selected.length === 0}>
          <Text>Continue</Text>
          <Icon as={ArrowRightIcon} className="ml-1 size-4 text-primary-foreground" />
        </Button>
      </View>
    </SafeAreaView>
  );
}
