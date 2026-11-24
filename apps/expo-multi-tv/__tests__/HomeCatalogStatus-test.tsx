import type TestRenderer from 'react-test-renderer';

const mockDispatch = jest.fn();
const mockToggleMenu = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn(), dispatch: mockDispatch }),
  DrawerActions: { openDrawer: () => ({ type: 'OPEN_DRAWER' }) },
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
  useMenuContext: () => ({ isOpen: false, toggleMenu: mockToggleMenu }),
}));

const item = {
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
};

const respond = (items: unknown[]) => ({
  ok: true,
  json: () => Promise.resolve({ catalog_version: '1', updated_at: '2026-01-01', items }),
});
const ok = () => Promise.resolve(respond([item]));
const empty = () => Promise.resolve(respond([]));
const fail = () => Promise.resolve({ ok: false, status: 503 });

const fetchMock = jest.fn();
const globalWithFetch = globalThis as unknown as { fetch: typeof fetchMock };
const originalFetch = globalWithFetch.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  mockDispatch.mockReset();
  mockToggleMenu.mockReset();
  globalWithFetch.fetch = fetchMock;
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => {
  globalWithFetch.fetch = originalFetch;
});

async function renderHome() {
  jest.resetModules();
  const React = require('react');
  const renderer: typeof TestRenderer = require('react-test-renderer');
  const Home = require('../../../packages/shared-ui/src/screens/HomeScreen').default;
  let tree!: TestRenderer.ReactTestRenderer;
  await renderer.act(async () => {
    tree = renderer.create(React.createElement(Home));
  });
  await renderer.act(async () => {});
  return { tree, act: renderer.act };
}

const hasText = (tree: TestRenderer.ReactTestRenderer, text: string) =>
  tree.root.findAll((node) => node.props.children === text).length > 0;
const rows = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAll((node) => (node.type as unknown) === 'SpatialList');
const retryButton = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAllByProps({ text: 'Retry' });
const spatialRoot = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.find((node) => (node.type as unknown) === 'SpatialRoot');

it('shows an error and a focusable Retry inside the navigation root when the catalog fails to load', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  fetchMock.mockImplementation(fail);
  const { tree, act } = await renderHome();

  expect(hasText(tree, 'Unable to load movies.')).toBe(true);
  expect(hasText(tree, 'Loading movies...')).toBe(false);
  expect(spatialRoot(tree).findAllByProps({ text: 'Retry' })).toHaveLength(1);
  expect(rows(tree)).toHaveLength(0);

  await act(async () => {
    spatialRoot(tree).props.onDirectionHandledWithoutMovement('left');
  });
  expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' });
  expect(mockToggleMenu).toHaveBeenCalledWith(true);
  await act(async () => tree.unmount());
});

it('fetches once more when Retry is selected twice and then shows the rows', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  fetchMock.mockImplementationOnce(fail).mockImplementation(ok);
  const { tree, act } = await renderHome();
  expect(fetchMock).toHaveBeenCalledTimes(1);

  const { onSelect } = retryButton(tree)[0].props;
  await act(async () => {
    onSelect();
    onSelect();
  });
  await act(async () => {});

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(retryButton(tree)).toHaveLength(0);
  expect(rows(tree).length).toBeGreaterThan(0);
  expect(rows(tree)[0].props.data).toHaveLength(1);
  await act(async () => tree.unmount());
});

it('shows an empty-state message instead of the loader when the catalog has no items', async () => {
  fetchMock.mockImplementation(empty);
  const { tree, act } = await renderHome();

  expect(hasText(tree, 'No movies are available.')).toBe(true);
  expect(hasText(tree, 'Loading movies...')).toBe(false);
  expect(retryButton(tree)).toHaveLength(0);
  expect(rows(tree)).toHaveLength(0);
  await act(async () => tree.unmount());
});

it('logs no React warning when Home unmounts while the catalog is still loading', async () => {
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  let resolve!: (value: unknown) => void;
  fetchMock.mockImplementation(() => new Promise((r) => (resolve = r)));
  const { tree, act } = await renderHome();
  expect(hasText(tree, 'Loading movies...')).toBe(true);

  await act(async () => tree.unmount());
  resolve(respond([item]));
  await new Promise((r) => setTimeout(r, 0));

  expect(errors).not.toHaveBeenCalled();
});
