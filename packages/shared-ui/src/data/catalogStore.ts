import { CardData, fetchMoviesData } from './moviesData';

export type CatalogState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; items: CardData[] }
  | { status: 'failed'; error: Error };

export type CatalogStore = {
  getState: () => CatalogState;
  subscribe: (listener: () => void) => () => void;
  /** Starts the request when none has started. A no-op while loading, after success and after failure. */
  ensureLoaded: () => void;
  /** Starts a new request after a failure. A no-op in any other state. */
  retry: () => void;
};

export function createCatalogStore(load: () => Promise<CardData[]>): CatalogStore {
  let state: CatalogState = { status: 'idle' };
  const listeners = new Set<() => void>();

  const set = (next: CatalogState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const start = () => {
    set({ status: 'loading' });
    load().then(
      (items) => set({ status: 'loaded', items }),
      (error: unknown) => set({ status: 'failed', error: error instanceof Error ? error : new Error(String(error)) }),
    );
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    ensureLoaded: () => {
      if (state.status === 'idle') start();
    },
    retry: () => {
      if (state.status === 'failed') start();
    },
  };
}

export const catalogStore = createCatalogStore(fetchMoviesData);
