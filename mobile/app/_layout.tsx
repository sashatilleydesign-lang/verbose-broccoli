import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  EBGaramond_400Regular,
  EBGaramond_400Regular_Italic,
  EBGaramond_500Medium,
} from "@expo-google-fonts/eb-garamond";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";
import { useColorScheme } from "react-native";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [authChecked, setAuthChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  const [fontsLoaded] = useFonts({
    EBGaramond_400Regular,
    EBGaramond_400Regular_Italic,
    EBGaramond_500Medium,
  });

  useEffect(() => {
    SecureStore.getItemAsync("strobe_token").then((t) => {
      setHasToken(!!t);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!fontsLoaded || !authChecked) return;
    SplashScreen.hideAsync();
    const inAuth = segments[0] === "(auth)";
    if (!hasToken && !inAuth) router.replace("/(auth)/login");
    if (hasToken && inAuth) router.replace("/(tabs)/focus");
  }, [fontsLoaded, authChecked, hasToken]);

  if (!fontsLoaded || !authChecked) return null;

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
