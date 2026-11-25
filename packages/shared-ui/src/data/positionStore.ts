import type { CardData } from './moviesData';

type MovieId = CardData['id'];

interface PositionStorage {
  read(): string | null | Promise<string | null>;
  write(value: string | null): void | Promise<void>;
}

/** A position in the last 5% of a title counts as finished. */
export const FINISHED_FRACTION = 0.95;
/** Keep the most recently watched titles only, so the saved value stays small. */
const MAX_TITLES = 100;

const isPosition = (time: unknown): time is number => typeof time === 'number' && Number.isFinite(time) && time > 0;

// Saved as [id, seconds] pairs, oldest first. A Map keeps that order; object keys that look
// like numbers would not.
const parse = (raw: string | null): Map<string, number> => {
  const positions = new Map<string, number>();
  try {
    const saved: unknown = raw && JSON.parse(raw);
    if (Array.isArray(saved)) {
      for (const entry of saved) {
        if (Array.isArray(entry) && typeof entry[0] === 'string' && isPosition(entry[1])) {
          positions.set(entry[0], entry[1]);
        }
      }
    }
  } catch {
    // A corrupt value starts every title from the beginning.
  }
  return positions;
};

export function createPositionStore(storage: PositionStorage) {
  let positions = new Map<string, number>();
  // Titles saved or cleared before the first read finished. Those choices win over the read.
  let changedBeforeLoad: Map<string, number | undefined> | null = new Map();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const loaded = (async () => {
    let saved = new Map<string, number>();
    try {
      saved = parse(await storage.read());
    } catch {
      // Storage may be unavailable. Positions saved this session still apply.
    }
    for (const [key, time] of changedBeforeLoad!) {
      saved.delete(key);
      if (time !== undefined) saved.set(key, time);
    }
    changedBeforeLoad = null;
    positions = saved;
    notify();
  })();
  let pending: Promise<void> = loaded;

  const update = (id: MovieId, time: number | undefined) => {
    const key = String(id);
    // A paused player saves the same position every interval. Skip the write.
    if (!changedBeforeLoad && positions.get(key) === time) return;
    const next = new Map(positions);
    next.delete(key);
    if (time !== undefined) next.set(key, time);
    for (const old of [...next.keys()].slice(0, Math.max(0, next.size - MAX_TITLES))) next.delete(old);
    positions = next;
    changedBeforeLoad?.set(key, time);
    notify();
    // The first write waits for the read, so a save during start-up keeps the other titles.
    // Writes complete in call order.
    pending = pending
      .then(() => storage.write(positions.size ? JSON.stringify([...positions]) : null))
      .catch(() => {
        // Storage may be unavailable (e.g. private browsing). Positions still apply this session.
      });
  };

  return {
    /** Resolves after the saved positions have been read. */
    loaded,
    /** The saved position in seconds, or undefined to start from the beginning. */
    get: (id: MovieId): number | undefined => positions.get(String(id)),
    /** Record where playback stopped. A position at 0 or in the last 5% clears the title. */
    save(id: MovieId, time: number, duration: number) {
      if (!(duration > 0) || !Number.isFinite(time)) return;
      update(id, time > 0 && time < duration * FINISHED_FRACTION ? time : undefined);
    },
    /** Called after every change, including the first read. Returns the unsubscribe function. */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type PositionStore = ReturnType<typeof createPositionStore>;
export const positionsKey = 'multi-tv.playback-positions';
