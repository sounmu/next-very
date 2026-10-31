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

function RootNavigator() {
  const { loading, user, store } = useSession();
  if (loading) return null;

  const signedOut = user === null;
  const needsStore = !signedOut && store === null;
  const hasStore = !signedOut && store !== null;
  const entry = signedOut ? '/login' : needsStore ? '/onboarding' : '/';

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={signedOut} redirectTo={entry}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={needsStore} redirectTo={entry}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={hasStore} redirectTo={entry}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="mypage" />
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
    </Stack>
  );
}
