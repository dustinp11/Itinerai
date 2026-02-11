import { Stack } from 'expo-router';

export default function CreateItineraryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  );
}
