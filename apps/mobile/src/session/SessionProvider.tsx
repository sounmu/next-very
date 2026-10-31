import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';

/** Device storage only (phase 1). Holds no password or token. */
const STORAGE_KEY = 'marginlog.session.v1';

/**
 * `mode` is null when signed out and 'showcase' inside 한끼식당. 'demo' is the removed
 * "데모로 시작하기" new store; a device that still has it opens the showcase.
 * Other keys left by the old new-store data are ignored.
 */
const SavedSchema = z.object({ mode: z.enum(['demo', 'showcase']).nullable() });
type Mode = 'showcase' | null;

export type Session = {
  mode: Mode;
  loading: boolean;
  startShowcase: () => Promise<void>;
  leave: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

async function load(): Promise<Mode> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  const parsed = SavedSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.warn('[session] saved data did not match the schema; starting fresh', parsed.error.issues);
    return null;
  }
  return parsed.data.mode === null ? null : 'showcase';
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(null);
  const [loading, setLoading] = useState(true);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    load()
      .catch((error: unknown) => {
        console.warn('[session] could not read device storage; starting fresh', error);
        return null;
      })
      .then((saved) => {
        setMode(saved);
        setLoading(false);
      });
  }, []);

  /** Writes run one after another; state changes only after the write succeeds. */
  function save(next: Mode): Promise<void> {
    const run = queue.current.then(async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: next }));
      setMode(next);
    });
    queue.current = run.catch(() => undefined);
    return run;
  }

  const value: Session = {
    mode,
    loading,
    startShowcase: () => save('showcase'),
    leave: () => save(null),
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}
