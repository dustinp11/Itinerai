import * as React from 'react';
import { Alert, ScrollView, View, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { ArrowLeftIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

import USStatesAndCities from '@/assets/states_and_cities.json';

type StatesAndCitiesMap = Record<string, string[]>;
const US_MAP = USStatesAndCities as unknown as StatesAndCitiesMap;

const COUNTRIES = [{ code: 'US' as const, name: 'United States' }];

const PICKER_ITEM_COLOR = { light: 'hsl(0, 0%, 3.9%)', dark: 'hsl(0, 0%, 98%)' };

function WheelPickerModal({
  visible,
  title,
  value,
  options,
  onChange,
  onClose,
  searchPlaceholder,
}: {
  visible: boolean;
  title: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  onClose: () => void;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = React.useState('');
  const { colorScheme } = useColorScheme();
  const pickerItemColor = colorScheme === 'dark' ? PICKER_ITEM_COLOR.dark : PICKER_ITEM_COLOR.light;

  React.useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const filteredOptions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  React.useEffect(() => {
    if (!visible) return;
    if (filteredOptions.length === 0) return;
    if (!filteredOptions.includes(value)) {
      onChange(filteredOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, query, options]);

  const pickerValue =
    filteredOptions.length > 0
      ? filteredOptions.includes(value)
        ? value
        : filteredOptions[0]
      : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0)' }} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={2}>
        <SafeAreaView
          className="bg-background"
          style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' }}
          edges={['bottom', 'left', 'right']}>

          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <View style={{ width: 56 }} />
            <Text className="text-base font-bold">{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} className="px-2 py-1.5">
              <Text className="text-base font-semibold">Done</Text>
            </Pressable>
          </View>

          <View className="px-4 pb-2 pt-3">
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder ?? 'Search...'}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          <Picker
            selectedValue={pickerValue}
            onValueChange={(v) => onChange(String(v))}
            enabled={filteredOptions.length > 0}>
            {(filteredOptions.length ? filteredOptions : ['No matches']).map((opt) => (
              <Picker.Item key={opt} label={opt} value={opt} color={pickerItemColor} />
            ))}
          </Picker>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function CreateItineraryStep1() {
  const [countryCode, setCountryCode] = React.useState<'US'>('US');
  const { colorScheme } = useColorScheme();
  const pickerItemColor = colorScheme === 'dark' ? PICKER_ITEM_COLOR.dark : PICKER_ITEM_COLOR.light;

  const stateNames = React.useMemo(() => Object.keys(US_MAP).sort(), []);

  const [stateName, setStateName] = React.useState<string>(() => {
    if (US_MAP['California']) return 'California';
    return stateNames[0] ?? '';
  });

  const citiesForState = React.useMemo(() => {
    return (US_MAP[stateName] ?? []).slice().sort();
  }, [stateName]);

  const [cityName, setCityName] = React.useState<string>(() => {
    const caCities = US_MAP['California'];
    if (caCities?.length) return caCities[0];
    const firstState = stateNames[0];
    const firstCities = firstState ? US_MAP[firstState] : [];
    return firstCities?.[0] ?? '';
  });

  React.useEffect(() => {
    const nextCities = (US_MAP[stateName] ?? []).slice().sort();
    setCityName(nextCities[0] ?? '');
  }, [stateName]);

  const [stateWheelOpen, setStateWheelOpen] = React.useState(false);
  const [cityWheelOpen, setCityWheelOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  function onContinue() {
    setIsLoading(true);

    const country = COUNTRIES.find((c) => c.code === countryCode)?.name ?? '';
    const state = stateName.trim();
    const city = cityName.trim();

    if (!country) return Alert.alert('Missing country', 'Please select a country.');
    if (!state) return Alert.alert('Missing state', 'Please select a state.');
    if (!city) return Alert.alert('Missing city', 'Please select a city.');

    router.push({
      pathname: '/(create-itinerary)/step2',
      params: { country, state, city },
    });
    setTimeout(() => setIsLoading(false), 100);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}>

        <View style={{ marginBottom: 8 }}>
          <Pressable
            onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/'))}
            className="flex-row items-center gap-1.5 self-start">
            <Icon as={ArrowLeftIcon} className="size-4 text-foreground" />
            <Text className="text-sm font-medium">Back</Text>
          </Pressable>
        </View>

        <Text className="text-2xl font-bold text-foreground" style={{ marginBottom: 2 }}>
          Start your itinerary
        </Text>
        <Text className="text-muted-foreground" style={{ marginBottom: 12 }}>
          Choose a location. We'll recommend places and help you build a route step-by-step.
        </Text>

        <Text className="text-xs text-muted-foreground">Country</Text>
        <View
          className="border border-border rounded-xl overflow-hidden"
          style={{ height: 56, justifyContent: 'center' }}>
          <Picker
            style={{ height: 56, width: '100%' }}
            itemStyle={{ height: 56, fontSize: 16 }}
            selectedValue={countryCode}
            onValueChange={(val) => setCountryCode(val)}>
            {COUNTRIES.map((c) => (
              <Picker.Item key={c.code} label={c.name} value={c.code} color={pickerItemColor} />
            ))}
          </Picker>
        </View>

        <Text className="text-xs text-muted-foreground">State</Text>
        <Pressable
          className="border border-border rounded-xl bg-background px-3 py-3.5 justify-center"
          onPress={() => setStateWheelOpen(true)}>
          <Text className="text-base font-medium text-foreground">{stateName || 'Select a state'}</Text>
        </Pressable>

        <WheelPickerModal
          visible={stateWheelOpen}
          title="Select a state"
          value={stateName}
          options={stateNames}
          onChange={(v) => setStateName(v)}
          onClose={() => setStateWheelOpen(false)}
          searchPlaceholder="Search state..."
        />

        <Text className="text-xs text-muted-foreground">City</Text>
        <Pressable
          className={`border border-border rounded-xl bg-background px-3 py-3.5 justify-center${citiesForState.length === 0 ? ' opacity-60' : ''}`}
          onPress={() => setCityWheelOpen(true)}
          disabled={citiesForState.length === 0}>
          <Text className="text-base font-medium text-foreground">
            {cityName || (citiesForState.length ? 'Select a city' : 'No cities available')}
          </Text>
        </Pressable>

        <WheelPickerModal
          visible={cityWheelOpen}
          title="Select a city"
          value={cityName}
          options={citiesForState}
          onChange={(v) => setCityName(v)}
          onClose={() => setCityWheelOpen(false)}
          searchPlaceholder="Search city..."
        />

        <View style={{ height: 12 }} />

        <Button
          onPress={onContinue}
          className="mt-4"
          disabled={!stateName || !cityName || isLoading}>
          <Text>Continue</Text>
        </Button>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
