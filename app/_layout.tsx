import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useCallback, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { initializeProgress } from '@/services/progress';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { ThemeProvider } from '@/context/ThemeContext';
import { fonts } from '@/constants/fonts';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts
        await Font.loadAsync({
          [fonts.regular]: require('../assets/fonts/Poppins-Regular.ttf'),
          [fonts.medium]: require('../assets/fonts/Poppins-Medium.ttf'),
          [fonts.semiBold]: require('../assets/fonts/Poppins-SemiBold.ttf'),
          [fonts.bold]: require('../assets/fonts/Poppins-Bold.ttf'),
          [fonts.mono]: require('../assets/fonts/SpaceMono-Regular.ttf'),
        });
        setFontsLoaded(true);
      } catch (e) {
        console.warn('Error loading fonts:', e);
        // Continue without custom fonts
        setFontsLoaded(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (!authLoading && fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authLoading]);

  useEffect(() => {
    initializeProgress();
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    } else if (!authLoading && user && segments[0] === '(auth)') {
      router.replace('/');
    }
  }, [user, authLoading, segments]);

  if (authLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
        <ActivityIndicator size="large" color="#6441A5" />
        <Text>Loading... {authLoading ? 'Auth' : 'Fonts'}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
