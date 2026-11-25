import { createCatalogStore } from '../catalogStore';
import { CATALOG_TIMEOUT_MS, fetchMoviesData, type CatalogItem } from '../moviesData';

jest.mock('../../utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const item = (id: string): CatalogItem => ({
  id,
  type: 'movie',
  title: id,
  category: '',
  genres: [],
  trending: false,
  rating_count: 0,
  rating_stars: 0,
  content_rating: '',
  release_year: 2020,
  duration_sec: 0,
  images: { poster_16x9: `https://img.example/${id}.jpg` },
  sources: [{ type: 'video/mp4', url: `https://v.example/${id}.mp4` }],
  description: '',
});

const catalogResponse = (ids: string[]) =>
  ({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ catalog_version: '1', updated_at: '', items: ids.map(item) }),
  }) as unknown as Response;

type PendingRequest = { resolve: (response: Response) => void; signal: AbortSignal | undefined };

// A fetch that never answers on its own and ignores abort, like a stalled socket on a runtime without abort support.
const stallingFetch = () => {
  const requests: PendingRequest[] = [];
  const fetchMock = jest.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((resolve) => {
        requests.push({ resolve, signal: init?.signal ?? undefined });
      }),
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  return { fetchMock, requests };
};

const realFetch = global.fetch;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  global.fetch = realFetch;
});

it('rejects and aborts a request that gets no response within the timeout', async () => {
  const { requests } = stallingFetch();
  const result = fetchMoviesData();
  const outcome = jest.fn();
  result.then(outcome, outcome);

  await jest.advanceTimersByTimeAsync(CATALOG_TIMEOUT_MS - 1);
  expect(outcome).not.toHaveBeenCalled();
  expect(requests[0].signal?.aborted).toBe(false);

  await jest.advanceTimersByTimeAsync(1);
  await expect(result).rejects.toThrow(`Catalog request timed out after ${CATALOG_TIMEOUT_MS} ms`);
  expect(requests[0].signal?.aborted).toBe(true);
});

it('times out when the headers arrive but the body stalls', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => new Promise(() => {}) } as unknown as Response),
  ) as unknown as typeof fetch;
  const rejected = jest.fn();
  fetchMoviesData().catch(rejected);

  await jest.advanceTimersByTimeAsync(CATALOG_TIMEOUT_MS);

  expect(rejected).toHaveBeenCalledWith(new Error(`Catalog request timed out after ${CATALOG_TIMEOUT_MS} ms`));
});

it('clears the timer when the request settles first', async () => {
  global.fetch = jest.fn(() => Promise.resolve(catalogResponse(['a']))) as unknown as typeof fetch;

  await expect(fetchMoviesData()).resolves.toEqual([expect.objectContaining({ id: 'a' })]);
  expect(jest.getTimerCount()).toBe(0);

  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 503 } as Response)) as unknown as typeof fetch;

  await expect(fetchMoviesData()).rejects.toThrow('HTTP error! status: 503');
  expect(jest.getTimerCount()).toBe(0);
});

it('moves the store to failed on a stall, and retry starts a fresh request with a fresh timeout', async () => {
  const { fetchMock, requests } = stallingFetch();
  const store = createCatalogStore(fetchMoviesData);

  store.ensureLoaded();
  await jest.advanceTimersByTimeAsync(CATALOG_TIMEOUT_MS);
  expect(store.getState()).toEqual({ status: 'failed', error: expect.any(Error) });

  store.retry();
  expect(store.getState()).toEqual({ status: 'loading' });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(requests[1].signal).not.toBe(requests[0].signal);
  expect(requests[1].signal?.aborted).toBe(false);

  // The first request answering late must not replace the state of the second.
  requests[0].resolve(catalogResponse(['late']));
  await jest.advanceTimersByTimeAsync(CATALOG_TIMEOUT_MS - 1);
  expect(store.getState()).toEqual({ status: 'loading' });

  requests[1].resolve(catalogResponse(['fresh']));
  await jest.advanceTimersByTimeAsync(0);
  expect(store.getState()).toEqual({ status: 'loaded', items: [expect.objectContaining({ id: 'fresh' })] });

  await jest.advanceTimersByTimeAsync(CATALOG_TIMEOUT_MS);
  expect(store.getState()).toEqual({ status: 'loaded', items: [expect.objectContaining({ id: 'fresh' })] });
  expect(jest.getTimerCount()).toBe(0);
});
