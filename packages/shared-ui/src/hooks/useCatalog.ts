import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { catalogStore } from '../data/catalogStore';
import type { CardData } from '../data/moviesData';

export type Catalog = (
  | { status: 'loading' }
  | { status: 'loaded'; items: CardData[] }
  | { status: 'failed'; error: Error }
) & { retry: () => void };

export function useCatalog(): Catalog {
  const state = useSyncExternalStore(catalogStore.subscribe, catalogStore.getState);

  useEffect(() => {
    catalogStore.ensureLoaded();
  }, []);

  return useMemo(() => {
    const { retry } = catalogStore;
    return state.status === 'idle' ? { status: 'loading', retry } : { ...state, retry };
  }, [state]);
}
