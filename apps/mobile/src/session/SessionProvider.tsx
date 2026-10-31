import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StockItemSchema,
  StoreMenuSchema,
  StoreProfileSchema,
  StoreSaleSchema,
  restoreSale,
  seedMenusOnce,
  seedStockOnce,
  sellOne,
  sellProblemText,
  type StoreMenu,
  type StoreSale,
  type StoreSetup,
} from '@marginlog/core';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';

/** Device storage only (phase 1). Holds no password or token. */
const STORAGE_KEY = 'marginlog.session.v1';

const SavedSchema = z.object({
  mode: z.enum(['demo', 'showcase']).nullable(),
  store: StoreProfileSchema.nullable(),
  menus: z.array(StoreMenuSchema),
  stock: z.array(StockItemSchema).default([]),
  sales: z.array(StoreSaleSchema).default([]),
  welcomePending: z.boolean(),
});
type Saved = z.infer<typeof SavedSchema>;

const EMPTY: Saved = { mode: null, store: null, menus: [], stock: [], sales: [], welcomePending: false };

export type SellOutcome = { ok: true; sale: StoreSale } | { ok: false; message: string };

/** Device-local calendar date, YYYY-MM-DD, for "오늘 판매". */
export function localToday(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export type Session = Saved & {
  loading: boolean;
  startShowcase: () => Promise<void>;
  leave: () => Promise<void>;
  completeSetup: (setup: StoreSetup) => Promise<void>;
  saveRecipe: (menuId: string, recipe: StoreMenu['recipe']) => Promise<void>;
  dismissWelcome: () => Promise<void>;
  /** Records one serving and deducts its recipe; a shortage changes nothing and says which ingredient. */
  sell: (menuId: string) => Promise<SellOutcome>;
  /** Removes the sale and puts back what it deducted. A second call for the same sale does nothing. */
  undoSale: (saleId: string) => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

async function load(): Promise<Saved> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === null) return EMPTY;
  const parsed = SavedSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.warn('[session] saved data did not match the schema; starting fresh', parsed.error.issues);
    return EMPTY;
  }
  // "데모로 시작하기" was removed; a device left in the new-store mode opens the showcase instead.
  return parsed.data.mode === 'demo' ? { ...parsed.data, mode: 'showcase' } : parsed.data;
}

const newStoreId = () => `store-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const newSaleId = () => `sale-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Stores set up before demo stock existed get it once; ingredients already tracked are left alone. */
function withSeededStock(saved: Saved): Saved {
  if (saved.store === null) return saved;
  const stock = seedStockOnce(saved.stock, saved.menus);
  return stock.length === saved.stock.length ? saved : { ...saved, stock };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Saved>(EMPTY);
  const [loading, setLoading] = useState(true);
  const current = useRef<Saved>(EMPTY);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    load()
      .catch((error: unknown) => {
        console.warn('[session] could not read device storage; starting fresh', error);
        return EMPTY;
      })
      .then((saved) => {
        current.current = saved;
        setState(saved);
        setLoading(false);
        commit(withSeededStock).catch((error: unknown) => console.warn('[session] could not save the demo stock', error));
      });
  }, []);

  /** Writes run one after another; state changes only after the write succeeds, so a failure keeps the screen's input. */
  function commit(update: (saved: Saved) => Saved): Promise<void> {
    const run = queue.current.then(async () => {
      const next = update(current.current);
      if (next === current.current) return;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      current.current = next;
      setState(next);
    });
    queue.current = run.catch(() => undefined);
    return run;
  }

  const value: Session = {
    ...state,
    loading,
    startShowcase: () => commit((saved) => ({ ...saved, mode: 'showcase' })),
    leave: () => commit((saved) => ({ ...saved, mode: null })),
    completeSetup: (setup) =>
      commit((saved) => {
        if (saved.store !== null) return saved;
        const menus = seedMenusOnce(saved.menus, setup.industry);
        return {
          ...saved,
          store: { ...setup, name: setup.name.trim(), id: newStoreId(), onboardedAt: new Date().toISOString() },
          menus,
          stock: seedStockOnce(saved.stock, menus),
          welcomePending: true,
        };
      }),
    saveRecipe: (menuId, recipe) =>
      commit((saved) => {
        if (!saved.menus.some((menu) => menu.id === menuId)) throw new Error('메뉴를 찾을 수 없어요');
        const menus = saved.menus.map((menu) => (menu.id === menuId ? { ...menu, recipe, edited: true } : menu));
        return { ...saved, menus, stock: seedStockOnce(saved.stock, menus) };
      }),
    dismissWelcome: () => commit((saved) => (saved.welcomePending ? { ...saved, welcomePending: false } : saved)),
    sell: async (menuId) => {
      let outcome: SellOutcome = { ok: false, message: '메뉴를 찾을 수 없어요' };
      await commit((saved) => {
        const menu = saved.menus.find((item) => item.id === menuId);
        if (!menu) return saved;
        const result = sellOne(saved.stock, menu, { id: newSaleId(), date: localToday() });
        if (!result.ok) {
          outcome = { ok: false, message: sellProblemText(result) };
          return saved;
        }
        outcome = { ok: true, sale: result.sale };
        return { ...saved, stock: result.stock, sales: [...saved.sales, result.sale] };
      });
      return outcome;
    },
    undoSale: (saleId) =>
      commit((saved) => {
        const sale = saved.sales.find((item) => item.id === saleId);
        if (!sale) return saved;
        return { ...saved, stock: restoreSale(saved.stock, sale), sales: saved.sales.filter((item) => item.id !== saleId) };
      }),
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}
