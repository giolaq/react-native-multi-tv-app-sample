import type TestRenderer from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn(), dispatch: jest.fn() }),
  DrawerActions: { openDrawer: jest.fn() },
}));
jest.mock('react-tv-space-navigation', () => ({
  SpatialNavigationRoot: 'SpatialRoot',
  SpatialNavigationNode: 'SpatialNode',
  SpatialNavigationScrollView: 'SpatialScroll',
  SpatialNavigationVirtualizedList: 'SpatialList',
  SpatialNavigationFocusableView: ({ children }: { children: (state: { isFocused: boolean }) => unknown }) =>
    children({ isFocused: false }),
  DefaultFocus: 'DefaultFocus',
}));
jest.mock('../../../packages/shared-ui/src/components/FocusablePressable', () => 'Button');
jest.mock('../../../packages/shared-ui/src/components/PlatformLinearGradient', () => 'Gradient');
jest.mock('../../../packages/shared-ui/src/components/MenuContext', () => ({
  useMenuContext: () => ({ isOpen: false, toggleMenu: jest.fn() }),
}));
jest.mock('../../../packages/shared-ui/src/components/AccessibilityContext', () => ({
  useTheme: () => jest.requireActual('../../../packages/shared-ui/src/theme').getDefaultTheme(),
}));

const catalog = {
  catalog_version: '1',
  updated_at: '2026-01-01',
  items: [
    {
      id: 'a',
      type: 'movie',
      title: 'Alpha',
      category: 'c',
      genres: [],
      trending: true,
      rating_count: 1,
      rating_stars: 5,
      content_rating: 'G',
      release_year: 2020,
      duration_sec: 60,
      images: { poster_16x9: 'poster' },
      sources: [{ type: 'video/mp4', url: 'movie.mp4' }],
      description: 'First',
    },
  ],
};

const ok = () => Promise.resolve({ ok: true, json: () => Promise.resolve(catalog) });
const fail = () => Promise.resolve({ ok: false, status: 503 });

const homeRows = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAll((node) => (node.type as unknown) === 'SpatialList')[0].props.data;

const flush = (act: typeof TestRenderer.act) => act(async () => {});

// Each test gets a fresh module registry, and with it a fresh catalog store.
function load() {
  jest.resetModules();
  const React = require('react');
  const renderer: typeof TestRenderer = require('react-test-renderer');
  const Home = require('../../../packages/shared-ui/src/screens/HomeScreen').default;
  const Explore = require('../../../packages/shared-ui/src/screens/ExploreScreen').default;
  return { React, renderer, Home, Explore };
}

const fetchMock = jest.fn();
const globalWithFetch = globalThis as unknown as { fetch: typeof fetchMock };
const originalFetch = globalWithFetch.fetch;

afterEach(() => jest.restoreAllMocks());

beforeEach(() => {
  fetchMock.mockReset();
  globalWithFetch.fetch = fetchMock;
});
afterAll(() => {
  globalWithFetch.fetch = originalFetch;
});

it('issues one catalog request for Home and Explore and shows the same titles on both', async () => {
  fetchMock.mockImplementation(ok);
  const { React, renderer, Home, Explore } = load();
  let home!: TestRenderer.ReactTestRenderer;
  let explore!: TestRenderer.ReactTestRenderer;
  await renderer.act(async () => {
    home = renderer.create(React.createElement(Home));
    explore = renderer.create(React.createElement(Explore));
  });
  await flush(renderer.act);

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(homeRows(home)).toHaveLength(1);
  expect(explore.root.findAllByProps({ accessibilityLabel: 'Alpha' }).length).toBeGreaterThan(0);

  await renderer.act(async () => {
    explore.unmount();
    explore = renderer.create(React.createElement(Explore));
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await renderer.act(async () => {
    home.unmount();
    explore.unmount();
  });
});

it('reports a failed load on Explore and fetches again only when Retry is selected', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  fetchMock.mockImplementationOnce(fail).mockImplementation(ok);
  const { React, renderer, Home, Explore } = load();
  let home!: TestRenderer.ReactTestRenderer;
  let explore!: TestRenderer.ReactTestRenderer;
  await renderer.act(async () => {
    home = renderer.create(React.createElement(Home));
    explore = renderer.create(React.createElement(Explore));
  });
  await flush(renderer.act);

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(explore.root.findAllByProps({ children: 'Unable to load the catalog.' }).length).toBeGreaterThan(0);
  expect(home.root.findAllByProps({ children: 'Unable to load movies.' }).length).toBeGreaterThan(0);

  await renderer.act(async () => {
    explore.root.findByProps({ text: 'Retry' }).props.onSelect();
  });
  await flush(renderer.act);

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(homeRows(home)).toHaveLength(1);
  expect(explore.root.findAllByProps({ accessibilityLabel: 'Alpha' }).length).toBeGreaterThan(0);
  await renderer.act(async () => {
    home.unmount();
    explore.unmount();
  });
});
