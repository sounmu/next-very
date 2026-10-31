import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
