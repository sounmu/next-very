import { describe, expect, it } from 'vitest';
import { LoginRequestSchema, LoginResponseSchema, StoreCreateSchema } from './auth';

describe('auth schemas', () => {
  it('LoginRequest trims a valid email and rejects a non-email', () => {
    expect(LoginRequestSchema.parse({ email: ' A@B.co ' }).email).toBe('A@B.co');
    expect(LoginRequestSchema.safeParse({ email: 'abc' }).success).toBe(false);
  });

  it('StoreCreate accepts new-store presets only', () => {
    expect(StoreCreateSchema.safeParse({ name: '파스타집', preset: 'pasta' }).success).toBe(true);
    expect(StoreCreateSchema.safeParse({ name: '한끼식당', preset: 'hankki' }).success).toBe(false);
    expect(StoreCreateSchema.safeParse({ name: ' ', preset: 'pizza' }).success).toBe(false);
  });

  it('LoginResponse allows a user without a store', () => {
    const parsed = LoginResponseSchema.parse({ token: 't', user: { id: 'u', email: 'a@b.co' }, store: null });
    expect(parsed.store).toBeNull();
  });
});
