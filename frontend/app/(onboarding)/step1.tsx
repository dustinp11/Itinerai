import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Toggle } from '@/components/ui/toggle';
import { router } from 'expo-router';
import { ArrowLeftIcon, ArrowRightIcon, Circle, CircleCheck } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACTIVITIES = [
  'Hiking',
  'Beach',
  'Museums',
  'Food & Dining',
  'Nightlife',
  'Shopping',
  'Nature',
  'Adventure',
  'Culture',
];

export default function OnboardingStep1() {
  const [selected, setSelected] = React.useState<string[]>([]);

  function toggleActivity(activity: string) {
    setSelected((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  }

  function onContinue() {
    router.push({
      pathname: '/(onboarding)/step2',
      params: { activities: JSON.stringify(selected) },
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-4">
        {router.canGoBack() && (
          <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5 self-start">
            <Icon as={ArrowLeftIcon} className="size-4 text-foreground" />
            <Text className="text-sm font-medium">Back</Text>
          </Pressable>
        )}

        <View className="mt-10 gap-2">
          <Text className="text-2xl font-bold">Let's help us get to know you better.</Text>
          <Text className="text-sm text-muted-foreground">
            Select some activities that excite you.
          </Text>
        </View>

        <View className="mt-8 flex-row flex-wrap gap-3">
          {ACTIVITIES.map((activity) => (
            <Toggle
              key={activity}
              variant="outline"
              pressed={selected.includes(activity)}
              onPressedChange={() => toggleActivity(activity)}
              className="rounded-full px-4"
            >
              {selected.includes(activity) ? (
                <Icon as={CircleCheck} className="size-5 text-foreground mr-2" />
              ) : (
                <Icon as={Circle} className="size-5 text-muted-foreground mr-2" />
              )}
              <Text>{activity}</Text>
            </Toggle>
          ))}
        </View>
      </View>

      <View className="px-6 pb-6">
        <Button className="w-full" onPress={onContinue} disabled={selected.length === 0}>
          <Text>Continue</Text>
          <Icon as={ArrowRightIcon} className="ml-1 size-4 text-primary-foreground" />
        </Button>
      </View>
    </SafeAreaView>
  );
}
