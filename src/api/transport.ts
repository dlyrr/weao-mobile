import { weao } from './client';
import type { Exploit, RobloxVersions } from './types';

/**
 * Live-data transport.
 *
 * WEAO publishes no websocket today. Its own site polls the REST API and
 * delivers background updates over browser Web Push (service worker +
 * `POST /api/notifications/subscribe`), neither of which a native app can use
 * directly — so this app polls.
 *
 * Everything above this file consumes `WeaoTransport`, so switching to a
 * websocket later means adding one implementation and changing the export at
 * the bottom. See `WebSocketTransport` for the stub.
 */

export interface WeaoSnapshot {
  exploits: Exploit[];
  versions: RobloxVersions;
  /** When this snapshot was produced. */
  fetchedAt: number;
}

export type SnapshotListener = (snapshot: WeaoSnapshot) => void;
export type ErrorListener = (error: unknown) => void;

export interface WeaoTransport {
  /** Begin delivering snapshots. Returns an unsubscribe function. */
  subscribe(onSnapshot: SnapshotListener, onError?: ErrorListener): () => void;
  /** Force an immediate refresh (pull-to-refresh). */
  refresh(): Promise<WeaoSnapshot>;
  /** True when updates arrive without the app asking. */
  readonly isRealtime: boolean;
}

/** The site refetches on this cadence; matching it keeps us well inside the rate limit. */
export const POLL_INTERVAL_MS = 60_000;

export async function fetchSnapshot(signal?: AbortSignal): Promise<WeaoSnapshot> {
  const [exploits, versions] = await Promise.all([
    weao.exploits(signal),
    weao.currentVersions(signal),
  ]);
  return { exploits, versions, fetchedAt: Date.now() };
}

export class PollingTransport implements WeaoTransport {
  readonly isRealtime = false;

  private listeners = new Set<SnapshotListener>();
  private errorListeners = new Set<ErrorListener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight: Promise<WeaoSnapshot> | null = null;

  constructor(private readonly intervalMs: number = POLL_INTERVAL_MS) {}

  subscribe(onSnapshot: SnapshotListener, onError?: ErrorListener): () => void {
    this.listeners.add(onSnapshot);
    if (onError) this.errorListeners.add(onError);

    if (!this.timer) {
      this.timer = setInterval(() => {
        void this.refresh().catch(() => {
          /* errors already fanned out to errorListeners */
        });
      }, this.intervalMs);
      // Kick off immediately so the first screen isn't blank for a full interval.
      void this.refresh().catch(() => {});
    }

    return () => {
      this.listeners.delete(onSnapshot);
      if (onError) this.errorListeners.delete(onError);
      if (this.listeners.size === 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
  }

  /** Coalesces concurrent callers onto a single request. */
  refresh(): Promise<WeaoSnapshot> {
    if (this.inFlight) return this.inFlight;

    this.inFlight = fetchSnapshot()
      .then((snapshot) => {
        this.listeners.forEach((l) => l(snapshot));
        return snapshot;
      })
      .catch((err) => {
        this.errorListeners.forEach((l) => l(err));
        throw err;
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }
}

/**
 * Drop-in for the day WEAO exposes a socket.
 *
 * To switch over: fill in the message handling below, then change
 * `createTransport()` to return this instead. Nothing else in the app changes,
 * because every screen reads snapshots through `WeaoTransport`.
 */
export class WebSocketTransport implements WeaoTransport {
  readonly isRealtime = true;

  private socket: WebSocket | null = null;
  private listeners = new Set<SnapshotListener>();
  private errorListeners = new Set<ErrorListener>();
  private fallback = new PollingTransport();
  private fallbackStop: (() => void) | null = null;

  constructor(private readonly url: string) {}

  subscribe(onSnapshot: SnapshotListener, onError?: ErrorListener): () => void {
    this.listeners.add(onSnapshot);
    if (onError) this.errorListeners.add(onError);

    if (!this.socket) this.connect();

    return () => {
      this.listeners.delete(onSnapshot);
      if (onError) this.errorListeners.delete(onError);
      if (this.listeners.size === 0) {
        this.socket?.close();
        this.socket = null;
        this.fallbackStop?.();
        this.fallbackStop = null;
      }
    };
  }

  private connect() {
    try {
      this.socket = new WebSocket(this.url);
    } catch (err) {
      this.degradeToPolling(err);
      return;
    }

    this.socket.onmessage = (event) => {
      try {
        // Shape unknown until WEAO documents one; assumed to carry both lists.
        const payload = JSON.parse(String(event.data)) as Partial<WeaoSnapshot>;
        if (!payload.exploits || !payload.versions) return;
        const snapshot: WeaoSnapshot = {
          exploits: payload.exploits,
          versions: payload.versions,
          fetchedAt: Date.now(),
        };
        this.listeners.forEach((l) => l(snapshot));
      } catch (err) {
        this.errorListeners.forEach((l) => l(err));
      }
    };

    this.socket.onerror = (err) => this.degradeToPolling(err);
    this.socket.onclose = () => this.degradeToPolling(new Error('WEAO socket closed'));
  }

  /** A dead socket must never mean a dead screen. */
  private degradeToPolling(err: unknown) {
    this.errorListeners.forEach((l) => l(err));
    if (this.fallbackStop) return;
    this.fallbackStop = this.fallback.subscribe(
      (snapshot) => this.listeners.forEach((l) => l(snapshot)),
      (e) => this.errorListeners.forEach((l) => l(e)),
    );
  }

  refresh(): Promise<WeaoSnapshot> {
    return this.fallback.refresh();
  }
}

let instance: WeaoTransport | null = null;

/** Single shared transport for the whole app. */
export function getTransport(): WeaoTransport {
  if (!instance) instance = new PollingTransport();
  return instance;
}
