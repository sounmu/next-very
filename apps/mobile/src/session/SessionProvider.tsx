import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LoginResponseSchema,
  MeResponseSchema,
  SHOWCASE_EMAIL,
  StoreCreateResponseSchema,
  type MeResponse,
  type StoreCreate,
  type StoreInfo,
} from '@marginlog/core/src/api/auth';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { ApiError, apiFetch, setAuthToken, setOnUnauthorized } from '@/api/client';

/** Only the server session token is kept on the device. */
const TOKEN_KEY = 'marginlog.auth.v1';

export type SessionUser = MeResponse['user'];

export type Session = {
  loading: boolean;
  /** null when signed out. */
  user: SessionUser | null;
  /** null when signed in but no store is set up yet. */
  store: StoreInfo | null;
  /** True right after createStore until the home card is dismissed. Memory only. */
  welcomePending: boolean;
  login: (email: string) => Promise<void>;
  loginShowcase: () => Promise<void>;
  logout: () => Promise<void>;
  createStore: (input: StoreCreate) => Promise<void>;
  dismissWelcome: () => void;
};

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [welcomePending, setWelcomePending] = useState(false);

  async function clearSession() {
    setAuthToken(null);
    setUser(null);
    setStore(null);
    setWelcomePending(false);
    queryClient.clear();
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.warn('[session] could not remove the saved token', error);
    }
  }

  useEffect(() => {
    // Any 401 means the token is no longer valid on the server.
    setOnUnauthorized(() => {
      void clearSession();
    });

    (async () => {
      let token: string | null = null;
      try {
        token = await AsyncStorage.getItem(TOKEN_KEY);
      } catch (error) {
        console.warn('[session] could not read device storage; starting signed out', error);
      }
      if (token === null) return;
      setAuthToken(token);
      try {
        const me = await apiFetch('/api/me', undefined, MeResponseSchema);
        setUser(me.user);
        setStore(me.store);
      } catch (error) {
        // A 401 already cleared the session through the handler. Other failures (server down)
        // also start signed out, but keep the token so the next start can try again.
        console.warn('[session] could not restore the session', error);
        if (!(error instanceof ApiError && error.status === 401)) {
          setAuthToken(null);
        }
      }
    })().finally(() => setLoading(false));

    return () => setOnUnauthorized(null);
  }, []);

  async function login(email: string) {
    const result = await apiFetch(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email }) },
      LoginResponseSchema,
    );
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    setAuthToken(result.token);
    queryClient.clear();
    setWelcomePending(false);
    setUser(result.user);
    setStore(result.store);
  }

  async function logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' }, z.unknown());
    } catch (error) {
      // A token the server no longer knows is already logged out.
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
    await clearSession();
  }

  async function createStore(input: StoreCreate) {
    const result = await apiFetch(
      '/api/store',
      { method: 'POST', body: JSON.stringify(input) },
      StoreCreateResponseSchema,
    );
    queryClient.clear();
    setWelcomePending(true);
    setStore(result.store);
  }

  const value: Session = {
    loading,
    user,
    store,
    welcomePending,
    login,
    loginShowcase: () => login(SHOWCASE_EMAIL),
    logout,
    createStore,
    dismissWelcome: () => setWelcomePending(false),
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}
