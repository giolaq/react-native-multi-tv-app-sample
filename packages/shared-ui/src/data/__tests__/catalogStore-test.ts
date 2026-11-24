import { createCatalogStore } from '../catalogStore';
import type { CardData } from '../moviesData';

const card = (id: string): CardData => ({ id, title: id, description: '', headerImage: '', movie: '' });

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

it('starts idle without calling the loader', () => {
  const load = jest.fn();
  const store = createCatalogStore(load);

  expect(store.getState()).toEqual({ status: 'idle' });
  expect(load).not.toHaveBeenCalled();
});

it('loads once however often ensureLoaded is called, then exposes the items', async () => {
  const request = deferred<CardData[]>();
  const load = jest.fn(() => request.promise);
  const store = createCatalogStore(load);

  store.ensureLoaded();
  store.ensureLoaded();
  expect(store.getState()).toEqual({ status: 'loading' });

  request.resolve([card('a')]);
  await settle();
  store.ensureLoaded();

  expect(store.getState()).toEqual({ status: 'loaded', items: [card('a')] });
  expect(load).toHaveBeenCalledTimes(1);
});

it('reports a failure and keeps it until retry', async () => {
  const load = jest.fn().mockRejectedValue(new Error('offline'));
  const store = createCatalogStore(load);

  store.ensureLoaded();
  await settle();
  store.ensureLoaded();

  expect(store.getState()).toEqual({ status: 'failed', error: new Error('offline') });
  expect(load).toHaveBeenCalledTimes(1);
});

it('wraps a non-Error rejection in an Error', async () => {
  const store = createCatalogStore(() => Promise.reject('boom'));

  store.ensureLoaded();
  await settle();

  expect(store.getState()).toEqual({ status: 'failed', error: new Error('boom') });
});

it('retry starts a new request after a failure and can then succeed', async () => {
  const load = jest
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce([card('a')]);
  const store = createCatalogStore(load);

  store.ensureLoaded();
  await settle();
  store.retry();
  expect(store.getState()).toEqual({ status: 'loading' });
  await settle();

  expect(store.getState()).toEqual({ status: 'loaded', items: [card('a')] });
  expect(load).toHaveBeenCalledTimes(2);
});

it('ignores retry unless the last request failed', async () => {
  const request = deferred<CardData[]>();
  const load = jest.fn(() => request.promise);
  const store = createCatalogStore(load);

  store.retry();
  expect(store.getState()).toEqual({ status: 'idle' });

  store.ensureLoaded();
  store.retry();
  request.resolve([]);
  await settle();
  store.retry();

  expect(store.getState()).toEqual({ status: 'loaded', items: [] });
  expect(load).toHaveBeenCalledTimes(1);
});

it('notifies subscribers on each transition', async () => {
  const store = createCatalogStore(() => Promise.resolve([card('a')]));
  const seen: string[] = [];
  store.subscribe(() => seen.push(store.getState().status));

  store.ensureLoaded();
  await settle();

  expect(seen).toEqual(['loading', 'loaded']);
});

it('stops notifying a subscriber after it unsubscribes', async () => {
  const store = createCatalogStore(() => Promise.resolve([card('a')]));
  const listener = jest.fn();
  const unsubscribe = store.subscribe(listener);

  unsubscribe();
  store.ensureLoaded();
  await settle();

  expect(listener).not.toHaveBeenCalled();
});
