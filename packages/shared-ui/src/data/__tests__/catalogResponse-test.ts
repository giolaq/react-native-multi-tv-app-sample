import { createCatalogStore } from '../catalogStore';
import { fetchMoviesData } from '../moviesData';
import { logger } from '../../utils/logger';

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

const respondWith = (body: unknown) => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(body) });
};

const loadCatalog = async () => {
  const store = createCatalogStore(fetchMoviesData);
  store.ensureLoaded();
  await settle();
  return store.getState();
};

const item = (overrides: Record<string, unknown> = {}) => ({
  id: 'good',
  title: 'Good',
  description: 'Plays',
  images: { poster_16x9: 'https://img.example/good.jpg' },
  sources: [{ type: 'video/mp4', url: 'https://v.example/good.mp4' }],
  ...overrides,
});

let warn: jest.SpyInstance;
let error: jest.SpyInstance;

beforeEach(() => {
  warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  error = jest.spyOn(logger, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('loads the valid items of a mixed catalog and warns about each skipped item', async () => {
  respondWith({
    catalog_version: '1',
    items: [
      item(),
      item({ id: 'hls', sources: [{ type: 'application/x-mpegURL', url: 'https://v.example/hls.m3u8' }] }),
      item({ id: 'no-title', title: undefined }),
      item({ id: 'blank-title', title: '  ' }),
      item({ id: 'no-images', images: undefined }),
      item({ id: 'no-poster', images: {} }),
      item({ id: 'no-sources', sources: undefined }),
      item({ id: 'empty-sources', sources: [] }),
      item({ id: 'sources-without-url', sources: [{ type: 'video/mp4' }, null, 'https://v.example/x.mp4'] }),
      item({ id: undefined }),
      null,
      'not an item',
    ],
  });

  const state = await loadCatalog();

  expect(state).toEqual({
    status: 'loaded',
    items: [
      {
        id: 'good',
        title: 'Good',
        description: 'Plays',
        headerImage: 'https://img.example/good.jpg',
        movie: 'https://v.example/good.mp4',
      },
      {
        id: 'hls',
        title: 'Good',
        description: 'Plays',
        headerImage: 'https://img.example/good.jpg',
        movie: 'https://v.example/hls.m3u8',
      },
    ],
  });
  expect(warn).toHaveBeenCalledTimes(10);
  expect(warn.mock.calls.map((call) => call.join(' '))).toEqual([
    expect.stringContaining('no-title'),
    expect.stringContaining('blank-title'),
    expect.stringContaining('no-images'),
    expect.stringContaining('no-poster'),
    expect.stringContaining('no-sources'),
    expect.stringContaining('empty-sources'),
    expect.stringContaining('sources-without-url'),
    expect.stringContaining('index 9'),
    expect.stringContaining('index 10'),
    expect.stringContaining('index 11'),
  ]);
});

it('keeps optional metadata optional and drops metadata of the wrong type', async () => {
  respondWith({
    items: [
      item({
        id: 7,
        description: undefined,
        duration_sec: 'long',
        genres: ['Drama', 3],
        release_year: 2023,
        rating_stars: 4.5,
        trending: false,
      }),
    ],
  });

  const state = await loadCatalog();

  expect(state).toEqual({
    status: 'loaded',
    items: [
      {
        id: 7,
        title: 'Good',
        description: '',
        headerImage: 'https://img.example/good.jpg',
        movie: 'https://v.example/good.mp4',
        releaseYear: 2023,
        rating: 4.5,
        trending: false,
      },
    ],
  });
  expect(warn).not.toHaveBeenCalled();
});

it.each([
  ['null', null],
  ['an array', [item()]],
  ['a string', 'catalog'],
  ['an object without items', { catalog_version: '1' }],
  ['an object whose items is not an array', { items: { 0: item() } }],
])('moves the store to failed when the response is %s', async (_label, body) => {
  respondWith(body);

  const state = await loadCatalog();

  expect(state).toEqual({ status: 'failed', error: expect.any(Error) });
  expect(error).toHaveBeenCalled();
});

it('loads an empty catalog when every item is malformed', async () => {
  respondWith({ items: [item({ title: undefined })] });

  expect(await loadCatalog()).toEqual({ status: 'loaded', items: [] });
  expect(warn).toHaveBeenCalledTimes(1);
});
