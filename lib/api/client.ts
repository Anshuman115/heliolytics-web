import 'server-only';
import { clearTimeout, setTimeout } from 'node:timers';
import { ContractError } from './compact';
import { AUTH_HEADER, CONTENT_SHA256_HEADER, signRequest } from './signing';

export const API_TIMEOUT_MS = 15_000;

export type ApiRequestMethod = 'GET' | 'POST' | 'PUT';

/** The exact fetch input the transport builds, so a test can inspect it. */
export type ApiFetcherInput = {
  method: ApiRequestMethod;
  headers: Record<string, string>;
  cache: 'no-store';
  signal: AbortSignal;
  /** ArrayBuffer-backed so it satisfies BodyInit without copying the bytes. */
  body?: Uint8Array<ArrayBuffer>;
};

export type ApiFetcher = (url: string, init: ApiFetcherInput) => Promise<Response>;

export type ApiRequestOptions = {
  method?: ApiRequestMethod;
  body?: Uint8Array;
  contentType?: string;
  fetcher?: ApiFetcher;
  timeoutMs?: number;
};

export type ApiResponse = {
  status: number;
  ok: boolean;
  json: unknown;
  retryAfterSec: number | null;
};

/** A safe API failure: status, machine code and bounded human text only. */
export class ApiError extends Error {
  readonly status: number;

  readonly code: string;

  readonly retryAfterSec: number | null;

  constructor(status: number, code: string, message: string, retryAfterSec: number | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }
}

const SAFE_STATUS: Record<number, string> = {
  400: 'The request was rejected',
  401: 'API authentication failed',
  403: 'The API refused this request',
  404: 'The API route was not found',
  405: 'The API method is not allowed',
  409: 'The API rejected a conflicting session',
  413: 'The upload was too large',
  422: 'The API rejected the payload',
  429: 'The API rate limit was reached',
  500: 'The API failed',
  503: 'The API is busy',
};

function readErrorBody(json: unknown): { code: string; message: string } | null {
  if (typeof json !== 'object' || json === null || !('error' in json)) return null;
  const error = json.error;
  if (typeof error !== 'object' || error === null) return null;
  if (!('code' in error) || !('message' in error)) return null;
  const code = error.code;
  const message = error.message;
  if (typeof code !== 'string' || typeof message !== 'string') return null;
  const safeCode = code.replace(/[^a-z0-9_]/gi, '').slice(0, 64);
  const safeMessage = message.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200);
  if (!safeCode || !safeMessage) return null;
  return { code: safeCode, message: safeMessage };
}

function toApiError(response: ApiResponse): ApiError {
  const parsed = readErrorBody(response.json);
  return new ApiError(
    response.status,
    parsed?.code ?? `http_${response.status}`,
    parsed?.message ?? SAFE_STATUS[response.status] ?? `API request failed (${response.status})`,
    response.retryAfterSec,
  );
}

/**
 * Sign and send one request. The URL is built once and split for signing, so
 * the escaped path and raw query sent to fetch are exactly the signed bytes.
 */
export async function sendApiRequest(
  path: string,
  {
    method = 'GET',
    body = new Uint8Array(0),
    contentType = '',
    fetcher = fetch,
    timeoutMs = API_TIMEOUT_MS,
  }: ApiRequestOptions = {},
): Promise<ApiResponse> {
  const base = (process.env.API_INTERNAL_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
  const url = `${base}${path}`;
  const separator = path.indexOf('?');
  const signed = signRequest({
    method,
    escapedPath: separator === -1 ? path : path.slice(0, separator),
    rawQuery: separator === -1 ? '' : path.slice(separator + 1),
    contentType,
    body,
  });

  const headers: Record<string, string> = {
    [AUTH_HEADER]: signed.auth,
    [CONTENT_SHA256_HEADER]: signed.contentSha256,
  };
  if (method !== 'GET') headers['Content-Type'] = contentType;

  // fetch requires an ArrayBuffer-backed view; a Buffer may sit in a shared pool.
  const rawBuffer = body.buffer;
  const fetchBody: Uint8Array<ArrayBuffer> =
    rawBuffer instanceof ArrayBuffer
      ? new Uint8Array(rawBuffer, body.byteOffset, body.byteLength)
      : new Uint8Array(body);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      method,
      headers,
      cache: 'no-store',
      signal: controller.signal,
      body: method === 'GET' ? undefined : fetchBody,
    });
    const text = await response.text();
    let json: unknown = null;
    if (text.length > 0) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfterSec = retryAfterHeader === null ? null : Number(retryAfterHeader);
    return {
      status: response.status,
      ok: response.ok,
      json,
      retryAfterSec:
        retryAfterSec !== null && Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? retryAfterSec
          : null,
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError(0, 'timeout', 'API request timed out', null);
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'network', 'Could not reach the API', null);
  } finally {
    clearTimeout(timer);
  }
}

/** Signed GET returning parsed JSON. Never retries on 401 or 429. */
export async function apiGet(
  path: string,
  options: { fetcher?: ApiFetcher; timeoutMs?: number } = {},
): Promise<unknown> {
  const response = await sendApiRequest(path, { ...options, method: 'GET' });
  if (!response.ok) throw toApiError(response);
  if (response.json === null) {
    throw new ContractError(`contract error: empty JSON body from ${path}`);
  }
  return response.json;
}
