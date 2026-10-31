import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '@/session/SessionProvider';
import { colors } from '@/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
});

/** Root stack. Headers are hidden; every screen draws its own with <Header />. */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Signed out: login and signup. A demo store without setup: onboarding only.
 * The showcase (한끼식당 server data) and a set-up demo store share the tabs;
 * each keeps its own detail screens so a new store never opens 한끼식당 data.
 */
function RootNavigator() {
  const { loading, mode, store } = useSession();
  if (loading) return null;

  const signedOut = mode === null;
  const needsSetup = mode === 'demo' && store === null;
  const showcase = mode === 'showcase';
  const storeReady = mode === 'demo' && store !== null;
  const entry = signedOut ? '/login' : needsSetup ? '/onboarding' : '/';

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={signedOut} redirectTo={entry}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
      </Stack.Protected>
      <Stack.Protected guard={needsSetup} redirectTo={entry}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={showcase || storeReady} redirectTo={entry}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="mypage" />
        <Stack.Protected guard={storeReady} redirectTo="/">
          <Stack.Screen name="store-menu/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={showcase} redirectTo="/">
          <Stack.Screen name="compare/[ingredientId]" />
          <Stack.Screen name="ingredients/index" />
          <Stack.Screen name="ingredients/[id]" />
          <Stack.Screen name="menus/index" />
          <Stack.Screen name="menus/[id]" />
          <Stack.Screen name="purchases/new" />
          <Stack.Screen name="purchases/[id]" />
          <Stack.Screen name="recipe/[menuId]" />
          <Stack.Screen name="records/upload" />
          <Stack.Screen name="records/[invoiceId]/review" />
          <Stack.Screen name="records/[invoiceId]/done" />
          <Stack.Screen name="shop/cart" />
          <Stack.Screen name="shop/orders/index" />
          <Stack.Screen name="shop/orders/[id]" />
        </Stack.Protected>
      </Stack.Protected>
    </Stack>
  );
}
