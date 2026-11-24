import { useMemo } from 'react';
import type { CardData } from '../data/moviesData';
import { useCatalog } from './useCatalog';

export type MovieLookup =
  | { status: 'loading' }
  | { status: 'failed'; retry: () => void }
  | { status: 'missing' }
  | { status: 'found'; movie: CardData };

// A deep link carries the id as a string, while the catalog may hold a number.
const sameId = (a: CardData['id'], b: CardData['id']) => String(a) === String(b);

export function useMovie(id: CardData['id']): MovieLookup {
  const catalog = useCatalog();
  return useMemo(() => {
    if (catalog.status === 'loading') return { status: 'loading' };
    if (catalog.status === 'failed') return { status: 'failed', retry: catalog.retry };
    const movie = catalog.items.find((item) => sameId(item.id, id));
    return movie ? { status: 'found', movie } : { status: 'missing' };
  }, [catalog, id]);
}
