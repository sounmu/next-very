import type { ZodType } from 'zod';

/**
 * Base URL of the MarginLog server (apps/server), without a trailing slash.
 * Expo inlines EXPO_PUBLIC_* at build time, so it must be read as this exact
 * static expression. See .env.example.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787').replace(/\/+$/, '');

export type ApiErrorKind =
  /** The server answered with a non-2xx status. */
  | 'http'
  /** fetch itself failed: no network, wrong URL, server down. */
  | 'network'
  /** The server answered 2xx but the body did not match the schema. */
  | 'parse';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** HTTP status; 0 for network errors. */
  readonly status: number;
  readonly path: string;
  /** Decoded response body (JSON when possible, otherwise text), if any. */
  readonly body: unknown;

  constructor(kind: ApiErrorKind, status: number, path: string, body: unknown, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.path = path;
    this.body = body;
  }
}

function messageFrom(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    for (const key of ['error', 'message']) {
      const value = record[key];
      if (typeof value === 'string' && value) return value;
    }
  }
  return `HTTP ${status}`;
}

/**
 * fetch against the API, parse the JSON body with the schema, return the typed
 * value. Throws ApiError on a network failure, a non-2xx status, or a body that
 * does not match the schema. A string body gets a JSON content type; FormData
 * (05 image upload) is sent as is.
 */
export async function apiFetch<T>(path: string, init: RequestInit | undefined, schema: ZodType<T>): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (typeof init?.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch (cause) {
    throw new ApiError('network', 0, path, undefined, '서버에 연결할 수 없어요', cause);
  }

  const text = await response.text();
  let body: unknown;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new ApiError('http', response.status, path, body, messageFrom(body, response.status));
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('parse', response.status, path, body, '서버 응답 형식이 달라요', parsed.error);
  }
  return parsed.data;
}
