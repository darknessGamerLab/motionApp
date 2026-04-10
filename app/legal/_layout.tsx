import { Stack } from 'expo-router';

/**
 * Legal screens layout — no header (each screen has its own back button)
 */
export default function LegalLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
