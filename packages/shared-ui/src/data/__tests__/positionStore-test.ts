import { createPositionStore } from '../positionStore';

function memoryStorage(initial: string | null = null) {
  const storage: {
    value: string | null;
    read: jest.Mock<Promise<string | null>, []>;
    write: jest.Mock<Promise<void>, [string | null]>;
  } = {
    value: initial,
    read: jest.fn(async () => storage.value),
    write: jest.fn(async (value: string | null) => {
      storage.value = value;
    }),
  };
  return storage;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

it('saves a position, keeps it across a restart and matches string and number ids', async () => {
  const storage = memoryStorage();
  const store = createPositionStore(storage);
  await store.loaded;
  store.save(7, 120, 600);
  expect(store.get('7')).toBe(120);
  await settle();

  const restarted = createPositionStore(storage);
  expect(restarted.get(7)).toBeUndefined();
  await restarted.loaded;
  expect(restarted.get(7)).toBe(120);
  expect(restarted.get('7')).toBe(120);
});

it('clears a title stopped in the last 5% or at the start, and keeps one just before', async () => {
  const storage = memoryStorage();
  const store = createPositionStore(storage);
  await store.loaded;
  store.save('a', 94, 100);
  expect(store.get('a')).toBe(94);
  store.save('a', 95, 100);
  expect(store.get('a')).toBeUndefined();
  store.save('b', 40, 100);
  store.save('b', 0, 100);
  expect(store.get('b')).toBeUndefined();
  await settle();
  expect(storage.value).toBeNull();
});

it('ignores a save before the duration is known, so leaving during the load keeps the old position', async () => {
  const store = createPositionStore(memoryStorage(JSON.stringify([['a', 300]])));
  await store.loaded;
  store.save('a', 0, 0);
  store.save('a', Number.NaN, 100);
  expect(store.get('a')).toBe(300);
});

it('keeps a save made before the first read finished, and the saved titles too', async () => {
  let finishRead!: (value: string) => void;
  const storage = memoryStorage();
  storage.read.mockReturnValueOnce(new Promise((resolve) => (finishRead = resolve)));
  const store = createPositionStore(storage);
  store.save('new', 50, 100);
  store.save('cleared', 99, 100);
  expect(storage.write).not.toHaveBeenCalled();
  finishRead(
    JSON.stringify([
      ['old', 10],
      ['new', 5],
      ['cleared', 30],
    ]),
  );
  await store.loaded;
  await settle();
  expect(store.get('new')).toBe(50);
  expect(store.get('old')).toBe(10);
  expect(store.get('cleared')).toBeUndefined();
  expect(JSON.parse(storage.value!)).toEqual([
    ['old', 10],
    ['new', 50],
  ]);
});

it('notifies subscribers after the read and after each save, and stops after unsubscribe', async () => {
  const store = createPositionStore(memoryStorage(JSON.stringify([['a', 10]])));
  const listener = jest.fn(() => store.get('a'));
  const unsubscribe = store.subscribe(listener);
  await store.loaded;
  store.save('a', 20, 100);
  expect(listener.mock.results.map((result) => result.value)).toEqual([10, 20]);
  unsubscribe();
  store.save('a', 30, 100);
  expect(listener).toHaveBeenCalledTimes(2);
});

it('starts from the beginning when the saved value is corrupt or storage fails', async () => {
  const corrupt = createPositionStore(memoryStorage('{not json'));
  await corrupt.loaded;
  expect(corrupt.get('a')).toBeUndefined();

  const wrongShape = createPositionStore(memoryStorage(JSON.stringify({ a: 10, b: [['c', 'x']] })));
  await wrongShape.loaded;
  expect(wrongShape.get('a')).toBeUndefined();

  const failing = memoryStorage();
  failing.read.mockRejectedValue(new Error('unavailable'));
  failing.write.mockRejectedValue(new Error('unavailable'));
  const store = createPositionStore(failing);
  await store.loaded;
  store.save('a', 10, 100);
  await settle();
  expect(store.get('a')).toBe(10);
});

it('skips the write when a paused player saves the same position again', async () => {
  const storage = memoryStorage();
  const store = createPositionStore(storage);
  await store.loaded;
  store.save('a', 10, 100);
  store.save('a', 10, 100);
  store.save('b', 0, 100);
  await settle();
  expect(storage.write).toHaveBeenCalledTimes(1);
});

it('writes in call order and keeps only the 100 most recently watched titles', async () => {
  const storage = memoryStorage();
  const store = createPositionStore(storage);
  await store.loaded;
  for (let id = 0; id < 101; id += 1) store.save(id, 10, 100);
  store.save(1, 20, 100);
  await settle();
  const saved: [string, number][] = JSON.parse(storage.value!);
  expect(saved).toHaveLength(100);
  expect(saved[0]).toEqual(['2', 10]);
  expect(saved[saved.length - 1]).toEqual(['1', 20]);
  expect(store.get(0)).toBeUndefined();
});
