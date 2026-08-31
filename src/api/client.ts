import type {
  ChangelogResponse,
  Exploit,
  RateLimitInfo,
  RobloxVersions,
} from './types';

/**
 * WEAO serves the same API from several domains. If one is having a bad day we
 * fall through to the next rather than showing an error.
 * (docs.weao.xyz: "You can access these endpoints on any of the domains".)
 */
const DEFAULT_HOSTS = [
  'https://weao.xyz',
  'https://whatexpsare.online',
  'https://weao.gg',
];

/**
 * On native this is always the list above. The web target cannot use it
 * directly — browsers forbid setting User-Agent, and WEAO does not send CORS
 * headers — so `EXPO_PUBLIC_WEAO_HOSTS` (comma-separated) can point the client
 * at a local proxy that adds both. Native builds ignore it unless it is set.
 */
const HOST_OVERRIDE: string | undefined = process.env.EXPO_PUBLIC_WEAO_HOSTS;

export const API_HOSTS: readonly string[] = HOST_OVERRIDE
  ? HOST_OVERRIDE.split(',')
      .map((host: string) => host.trim())
      .filter(Boolean)
  : DEFAULT_HOSTS;

/** Mandatory per the docs: requests without it are rejected. */
const USER_AGENT = 'WEAO-3PService';

const REQUEST_TIMEOUT_MS = 15_000;

export class WeaoRateLimitError extends Error {
  readonly info: RateLimitInfo;
  constructor(info: RateLimitInfo) {
    const seconds = info.remainingTime ? Math.ceil(info.remainingTime / 1000) : undefined;
    super(seconds ? `Rate limited by WEAO. Try again in ${seconds}s.` : 'Rate limited by WEAO.');
    this.name = 'WeaoRateLimitError';
    this.info = info;
  }
}

export class WeaoApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'WeaoApiError';
    this.status = status;
  }
}

async function fetchWithTimeout(url: string, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    return await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * GETs `path` from the first host that answers. A 429 is terminal — retrying
 * against a sibling domain would just burn the same quota — so it throws
 * immediately instead of falling through.
 */
async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let lastError: unknown;

  for (const host of API_HOSTS) {
    try {
      const res = await fetchWithTimeout(`${host}${path}`, signal);

      if (res.status === 429) {
        const body = (await res.json().catch(() => ({}))) as { rateLimitInfo?: RateLimitInfo };
        throw new WeaoRateLimitError(body.rateLimitInfo ?? {});
      }

      if (!res.ok) {
        throw new WeaoApiError(res.status, `WEAO responded ${res.status} for ${path}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof WeaoRateLimitError) throw err;
      if (signal?.aborted) throw err;
      lastError = err;
      // Try the next mirror.
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new WeaoApiError(0, `Could not reach WEAO for ${path}`);
}

export const weao = {
  /** Every tracked exploit, unordered — group with `groupExploits` for display. */
  exploits: (signal?: AbortSignal) => request<Exploit[]>('/api/status/exploits', signal),

  /** A single exploit by title, e.g. "Solara". */
  exploit: (name: string, signal?: AbortSignal) =>
    request<Exploit>(`/api/status/exploits/${encodeURIComponent(name)}`, signal),

  /** Accepts either the exploit title or its trackerId. */
  changelogs: (nameOrTrackerId: string, signal?: AbortSignal) =>
    request<ChangelogResponse>(
      `/api/status/exploits/changelogs/${encodeURIComponent(nameOrTrackerId)}`,
      signal,
    ),

  currentVersions: (signal?: AbortSignal) =>
    request<RobloxVersions>('/api/versions/current', signal),

  /** Only ever carries Windows and Mac. */
  futureVersions: (signal?: AbortSignal) =>
    request<RobloxVersions>('/api/versions/future', signal),

  pastVersions: (signal?: AbortSignal) => request<RobloxVersions>('/api/versions/past', signal),
};
