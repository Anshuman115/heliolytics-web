import { mintHeliolyticsToken } from './signing';

export const API_TIMEOUT_MS = 15_000;

type Fetcher = typeof fetch;

type ApiGetOptions = {
  fetcher?: Fetcher;
  timeoutMs?: number;
};

function baseUrl() {
  return process.env.API_INTERNAL_URL ?? 'http://localhost:8080';
}

export async function apiGet<T>(
  path: string,
  { fetcher = fetch, timeoutMs = API_TIMEOUT_MS }: ApiGetOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetcher(`${baseUrl()}${path}`, {
      headers: { 'X-Heliolytics-Token': mintHeliolyticsToken() },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (res.status === 429) throw new Error('Rate limit exceeded');
    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json() as Promise<T>;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('API request timed out');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
