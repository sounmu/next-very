import { z } from 'zod';
import type { PresetId } from '../presets/types';
import { IdSchema, TimestampSchema } from '../schemas';

/** The showcase user; its store 한끼식당 is a copy of the hankki preset. */
export const SHOWCASE_EMAIL = 'demo@marginlog.kr';

/** Body of POST /api/auth/login. Email only, no password. */
export const LoginRequestSchema = z.object({ email: z.string().trim().email() });
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const PresetIdSchema = z.enum(['hankki', 'pasta', 'pizza', 'gimbap'] as const satisfies readonly PresetId[]);

/** Presets a new store can start from. hankki belongs to the showcase store only. */
export const NewStorePresetSchema = z.enum(['pasta', 'pizza', 'gimbap'] as const satisfies readonly PresetId[]);
export type NewStorePreset = z.infer<typeof NewStorePresetSchema>;

export const StoreKindSchema = z.enum(['showcase', 'new']);
export type StoreKind = z.infer<typeof StoreKindSchema>;

export const StoreInfoSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  preset: PresetIdSchema,
  kind: StoreKindSchema,
  createdAt: TimestampSchema,
});
export type StoreInfo = z.infer<typeof StoreInfoSchema>;

/** Response of GET /api/me. store is null until the user sets one up. */
export const MeResponseSchema = z.object({
  user: z.object({ id: IdSchema, email: z.string().min(1) }),
  store: StoreInfoSchema.nullable(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

/** Response of POST /api/auth/login. Send the token as "Authorization: Bearer <token>". */
export const LoginResponseSchema = MeResponseSchema.extend({ token: z.string().min(1) });
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/** Body of POST /api/store. The new store starts as a copy of the preset. */
export const StoreCreateSchema = z.object({ name: z.string().trim().min(1), preset: NewStorePresetSchema });
export type StoreCreate = z.infer<typeof StoreCreateSchema>;

export const StoreCreateResponseSchema = z.object({ store: StoreInfoSchema });
export type StoreCreateResponse = z.infer<typeof StoreCreateResponseSchema>;
