import * as React from "react";
import {
  Alert,
  StyleSheet,
  ScrollView,
  View,
  Modal,
  Pressable,
  useColorScheme,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { ArrowLeftIcon, Loader2 } from "lucide-react-native";

import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";

import USStatesAndCities from "@/assets/states_and_cities.json";

type StatesAndCitiesMap = Record<string, string[]>;
const US_MAP = USStatesAndCities as unknown as StatesAndCitiesMap;

const COUNTRIES = [{ code: "US" as const, name: "United States" }];

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
  const [query, setQuery] = React.useState("");
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const colors = React.useMemo(
    () => ({
      pageBg: isDark ? "#000" : "#fff",
      cardBg: isDark ? "#111" : "#fff",
      border: isDark ? "#2a2a2a" : "#ddd",
      text: isDark ? "#fff" : "#111",
      muted: isDark ? "#bdbdbd" : "#555",
      inputBg: isDark ? "#1a1a1a" : "#fff",
      placeholder: isDark ? "#9a9a9a" : "#8a8a8a",
      backdrop: isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)",
    }),
    [isDark]
  );

  React.useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const filteredOptions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  React.useEffect(() => {
    if (!visible) return;
    if (filteredOptions.length === 0) return;
    if (!filteredOptions.includes(value)) onChange(filteredOptions[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, query, options]);

  const pickerValue =
    filteredOptions.length > 0
      ? filteredOptions.includes(value)
        ? value
        : filteredOptions[0]
      : "";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Dim background */}
      <Pressable style={[wheelStyles.backdrop, { backgroundColor: colors.backdrop }]} onPress={onClose} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={2}>
        <SafeAreaView style={[wheelStyles.sheet, { backgroundColor: colors.cardBg }]} edges={["bottom", "left", "right"]}>
          <View style={[wheelStyles.header, { borderBottomColor: colors.border }]}>
            <View style={{ width: 56 }} />
            <Text style={[wheelStyles.title, { color: colors.text }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={wheelStyles.doneBtn}>
              <Text style={[wheelStyles.doneText, { color: colors.text }]}>Done</Text>
            </Pressable>
          </View>

          {/* Search bar */}
          <View style={wheelStyles.searchWrap}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder ?? "Search..."}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              style={[
                wheelStyles.searchInput,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
          </View>

          {/* Wheel */}
          <Picker
            selectedValue={pickerValue}
            onValueChange={(v) => onChange(String(v))}
            enabled={filteredOptions.length > 0}
            style={{
              color: colors.text,
              backgroundColor: colors.cardBg,
            }}
            dropdownIconColor={colors.text}
          >
            {(filteredOptions.length ? filteredOptions : ["No matches"]).map((opt) => (
              <Picker.Item key={opt} label={opt} value={opt} color={colors.text} />
            ))}
          </Picker>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function CreateItineraryStep1() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const colors = React.useMemo(
    () => ({
      pageBg: isDark ? "#000" : "#fff",
      cardBg: isDark ? "#111" : "#fff",
      border: isDark ? "#2a2a2a" : "#ddd",
      text: isDark ? "#fff" : "#111",
      muted: isDark ? "#bdbdbd" : "#555",
    }),
    [isDark]
  );

  const [countryCode, setCountryCode] = React.useState<"US">("US");

  const stateNames = React.useMemo(() => Object.keys(US_MAP).sort(), []);

  const [stateName, setStateName] = React.useState<string>(() => {
    if (US_MAP["California"]) return "California";
    return stateNames[0] ?? "";
  });

  const citiesForState = React.useMemo(() => (US_MAP[stateName] ?? []).slice().sort(), [stateName]);

  const [cityName, setCityName] = React.useState<string>(() => {
    const caCities = US_MAP["California"];
    if (caCities?.length) return caCities[0];
    const firstState = stateNames[0];
    const firstCities = firstState ? US_MAP[firstState] : [];
    return firstCities?.[0] ?? "";
  });

  React.useEffect(() => {
    const nextCities = (US_MAP[stateName] ?? []).slice().sort();
    setCityName(nextCities[0] ?? "");
  }, [stateName]);

  const [stateWheelOpen, setStateWheelOpen] = React.useState(false);
  const [cityWheelOpen, setCityWheelOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  function onContinue() {
    const country = COUNTRIES.find((c) => c.code === countryCode)?.name ?? "";
    const state = stateName.trim();
    const city = cityName.trim();

    if (!country) return Alert.alert("Missing country", "Please select a country.");
    if (!state) return Alert.alert("Missing state", "Please select a state.");
    if (!city) return Alert.alert("Missing city", "Please select a city.");

    setIsLoading(true);
    router.push({
      pathname: "/(create-itinerary)/step2",
      params: { country, state, city },
    });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.pageBg }]} edges={["top", "left", "right"]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.pageBg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 8 }}>
          <Pressable
            onPress={() => (router.canGoBack?.() ? router.back() : router.replace("/"))}
            className="flex-row items-center gap-1.5 self-start"
          >
            <Icon as={ArrowLeftIcon} className="size-4 text-foreground" />
            <Text className="text-sm font-medium">Back</Text>
          </Pressable>
        </View>

        <Text style={[styles.h1, { color: colors.text }]}>Start your itinerary</Text>
        <Text style={[styles.sub, { color: colors.muted }]}>
          Choose a location. We’ll recommend places and help you build a route step-by-step.
        </Text>

        {/* Country */}
        <Text style={[styles.label, { color: colors.muted }]}>Country</Text>
        <View style={[styles.pickerBox, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
          <Picker
            style={[styles.picker, { color: colors.text }]}
            itemStyle={[styles.pickerItem, { color: colors.text }]}
            selectedValue={countryCode}
            onValueChange={(val) => setCountryCode(val)}
            dropdownIconColor={colors.text}
          >
            {COUNTRIES.map((c) => (
              <Picker.Item key={c.code} label={c.name} value={c.code} color={colors.text} />
            ))}
          </Picker>
        </View>

        {/* State */}
        <Text style={[styles.label, { color: colors.muted }]}>State</Text>
        <Pressable
          style={[styles.selectBox, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
          onPress={() => setStateWheelOpen(true)}
        >
          <Text style={[styles.selectText, { color: colors.text }]}>{stateName || "Select a state"}</Text>
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

        {/* City */}
        <Text style={[styles.label, { color: colors.muted }]}>City</Text>
        <Pressable
          style={[
            styles.selectBox,
            { borderColor: colors.border, backgroundColor: colors.cardBg },
            citiesForState.length === 0 && styles.selectBoxDisabled,
          ]}
          onPress={() => setCityWheelOpen(true)}
          disabled={citiesForState.length === 0}
        >
          <Text style={[styles.selectText, { color: colors.text }]}>
            {cityName || (citiesForState.length ? "Select a city" : "No cities available")}
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

        <Button onPress={onContinue} className="mt-4" disabled={!stateName || !cityName || isLoading}>
          <Text>Continue</Text>
          {isLoading && <Icon as={Loader2} className="ml-1 size-4 text-primary-foreground" />}
        </Button>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, gap: 10 },

  h1: { fontSize: 24, fontWeight: "700", marginBottom: 2 },
  sub: { marginBottom: 12 },
  label: { fontSize: 12 },

  pickerBox: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    height: 56,
    justifyContent: "center",
  },
  picker: { height: 56, width: "100%" },
  pickerItem: { height: 56, fontSize: 16 },

  selectBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  selectBoxDisabled: { opacity: 0.6 },
  selectText: { fontSize: 16, fontWeight: "500" },
});

const wheelStyles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 16, fontWeight: "700" },
  doneBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  doneText: { fontSize: 16, fontWeight: "600" },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});