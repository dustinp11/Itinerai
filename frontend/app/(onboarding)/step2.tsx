import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Toggle } from '@/components/ui/toggle';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftIcon, ArrowRightIcon, CircleCheckIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BUDGET_OPTIONS = [
  { key: 'budget', label: 'Budget ($0 - $50)' },
  { key: 'moderate', label: 'Moderate ($50 - $150)' },
  { key: 'luxury', label: 'Luxury ($150 - $500+)' },
];

export default function OnboardingStep2() {
  const { activities } = useLocalSearchParams<{ activities: string }>();
  const [selected, setSelected] = React.useState<string | null>(null);

  function onContinue() {
    router.push({
      pathname: '/(onboarding)/step3',
      params: { activities, budget: selected },
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-4">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5 self-start">
          <Icon as={ArrowLeftIcon} className="size-4 text-foreground" />
          <Text className="text-sm font-medium">Back</Text>
        </Pressable>

        <View className="mt-10 gap-2">
          <Text className="text-2xl font-bold">What's your budget?</Text>
          <Text className="text-sm text-muted-foreground">
            So we can recommend the best activities.
          </Text>
        </View>

        <View className="mt-8 gap-3">
          {BUDGET_OPTIONS.map((option) => (
            <Toggle
              key={option.key}
              variant="outline"
              pressed={selected === option.key}
              onPressedChange={() => setSelected(option.key)}
            >
              {selected === option.key && (
                <Icon as={CircleCheckIcon} className="size-5 text-foreground" />
              )}
              <Text>{option.label}</Text>
            </Toggle>
          ))}
        </View>
      </View>

      <View className="px-6 pb-6">
        <Button className="w-full" onPress={onContinue} disabled={!selected}>
          <Text>Continue</Text>
          <Icon as={ArrowRightIcon} className="ml-1 size-4 text-primary-foreground" />
        </Button>
      </View>
    </SafeAreaView>
  );
}
