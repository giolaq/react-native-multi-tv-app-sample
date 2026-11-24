import type TestRenderer from 'react-test-renderer';
import type { AccessibilityPreferences } from '../../../packages/shared-ui/src/theme/accessibility';

let mockPreferences: AccessibilityPreferences;
let mockFocused = false;

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn(), dispatch: jest.fn() }),
  DrawerActions: { openDrawer: () => ({ type: 'OPEN_DRAWER' }) },
}));
jest.mock('react-tv-space-navigation', () => ({
  SpatialNavigationRoot: 'SpatialRoot',
  SpatialNavigationNode: 'SpatialNode',
  SpatialNavigationScrollView: 'SpatialScroll',
  SpatialNavigationVirtualizedList: ({
    data,
    renderItem,
  }: {
    data: unknown[];
    renderItem: (info: { item: unknown; index: number }) => unknown;
  }) =>
    data.map((item, index) =>
      require('react').createElement(require('react').Fragment, { key: index }, renderItem({ item, index })),
    ),
  SpatialNavigationFocusableView: ({ children }: { children: (state: { isFocused: boolean }) => unknown }) =>
    children({ isFocused: mockFocused }),
  DefaultFocus: 'DefaultFocus',
}));
jest.mock('../../../packages/shared-ui/src/components/FocusablePressable', () => 'Button');
jest.mock('../../../packages/shared-ui/src/components/PlatformLinearGradient', () => 'Gradient');
jest.mock('../../../packages/shared-ui/src/components/MenuContext', () => ({
  useMenuContext: () => ({ isOpen: false, toggleMenu: jest.fn() }),
}));
// One theme object per set of preferences, as the real provider memoizes it.
jest.mock('../../../packages/shared-ui/src/components/AccessibilityContext', () => {
  const { createTheme } = jest.requireActual('../../../packages/shared-ui/src/theme/accessibility');
  const themes = new Map<string, unknown>();
  return {
    useTheme: () => {
      const key = JSON.stringify(mockPreferences);
      if (!themes.has(key)) themes.set(key, createTheme(mockPreferences));
      return themes.get(key);
    },
  };
});

const standard: AccessibilityPreferences = { highContrast: false, largerText: false, reduceMotion: false };
const boosted: AccessibilityPreferences = { highContrast: true, largerText: true, reduceMotion: false };

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
const respond = (items: unknown[]) =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ catalog_version: '1', updated_at: '2026-01-01', items }),
  });

const fetchMock = jest.fn();
const globalWithFetch = globalThis as unknown as { fetch: typeof fetchMock };
const originalFetch = globalWithFetch.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => respond([item]));
  mockFocused = false;
  globalWithFetch.fetch = fetchMock;
});
afterAll(() => {
  globalWithFetch.fetch = originalFetch;
});

async function render(screen: 'HomeScreen' | 'TVScreen', preferences: AccessibilityPreferences) {
  jest.resetModules();
  mockPreferences = preferences;
  const React = require('react');
  const renderer: typeof TestRenderer = require('react-test-renderer');
  const { StyleSheet, View, Image } = require('react-native');
  const { scaledPixels } = require('../../../packages/shared-ui/src/hooks/useScale');
  const { createTheme, highContrastColors, contrastRatio } = require('../../../packages/shared-ui/src/theme');
  const Screen = require(`../../../packages/shared-ui/src/screens/${screen}`).default;
  let tree!: TestRenderer.ReactTestRenderer;
  await renderer.act(async () => {
    tree = renderer.create(React.createElement(Screen));
  });
  await renderer.act(async () => {});

  const flat = (node: TestRenderer.ReactTestInstance) => StyleSheet.flatten(node.props.style);
  return {
    tree,
    act: renderer.act,
    scaledPixels,
    highContrastColors,
    contrastRatio,
    theme: createTheme(preferences),
    textStyle: (text: string) => flat(tree.root.find((n) => n.props.children === text && n.props.style)),
    containerStyle: () => flat(tree.root.find((n) => (n.type as unknown) === 'SpatialRoot').findAllByType(View)[0]),
    cards: () => tree.root.findAll((n) => n.props.item?.id === 'a' && n.props.styles),
    cardStyle: () => {
      const image = tree.root.findAll((n) => (n.type as unknown) === Image && n.props.onError)[0];
      return flat(image.parent!);
    },
  };
}

describe('HomeScreen theme', () => {
  it('keeps the standard colours and text size with every switch off', async () => {
    const view = await render('HomeScreen', standard);
    expect(view.containerStyle().backgroundColor).toBe(view.theme.colors.background);
    expect(view.textStyle('Alpha')).toMatchObject({ color: view.theme.colors.text, fontSize: view.scaledPixels(56) });
    await view.act(async () => view.tree.unmount());
  });

  it('uses the high-contrast colours and 25% larger text on the header, title and row headings', async () => {
    const view = await render('HomeScreen', boosted);
    expect(view.containerStyle().backgroundColor).toBe(view.highContrastColors.background);
    expect(view.textStyle('Alpha')).toMatchObject({
      color: view.highContrastColors.text,
      fontSize: view.scaledPixels(56 * 1.25),
    });
    expect(view.textStyle('First')).toMatchObject({
      fontSize: view.scaledPixels(28 * 1.25),
      lineHeight: view.scaledPixels(40 * 1.25),
    });
    expect(view.textStyle('Trending Movies')).toMatchObject({ fontSize: view.scaledPixels(40 * 1.25) });
    await view.act(async () => view.tree.unmount());
  });

  it.each([
    ['standard', standard],
    ['high contrast and large text', boosted],
  ])('rings the focused card visibly against the screen background in %s', async (_name, preferences) => {
    mockFocused = true;
    const view = await render('HomeScreen', preferences);
    const style = view.cardStyle();
    expect(style.borderColor).toBe(view.theme.focus.borderColor);
    expect(style.borderWidth).toBeGreaterThanOrEqual(view.theme.focus.borderWidth);
    expect(view.contrastRatio(style.borderColor, view.theme.colors.background)).toBeGreaterThanOrEqual(3);
    await view.act(async () => view.tree.unmount());
  });

  it('gives an unfocused card the theme resting border', async () => {
    const view = await render('HomeScreen', boosted);
    expect(view.cardStyle().borderColor).toBe(view.theme.focus.restingBorderColor);
    await view.act(async () => view.tree.unmount());
  });

  it('passes MovieItem the same styles object when Home re-renders under one theme', async () => {
    const view = await render('HomeScreen', boosted);
    const before = view.cards()[0].props.styles;
    mockFocused = true;
    await view.act(async () => {
      view.tree.update(
        require('react').createElement(require('../../../packages/shared-ui/src/screens/HomeScreen').default),
      );
    });
    expect(view.cards()[0].props.styles).toBe(before);
    await view.act(async () => view.tree.unmount());
  });

  it('themes the catalog status message', async () => {
    fetchMock.mockImplementation(() => respond([]));
    const view = await render('HomeScreen', boosted);
    expect(view.textStyle('No movies are available.')).toMatchObject({
      color: view.highContrastColors.text,
      fontSize: view.scaledPixels(24 * 1.25),
    });
    await view.act(async () => view.tree.unmount());
  });
});

describe('TVScreen theme', () => {
  it('uses the high-contrast background and a 25% larger title', async () => {
    const view = await render('TVScreen', boosted);
    expect(view.containerStyle().backgroundColor).toBe(view.highContrastColors.background);
    expect(view.textStyle('TV Screen')).toMatchObject({
      color: view.highContrastColors.text,
      fontSize: view.scaledPixels(32 * 1.25),
    });
    await view.act(async () => view.tree.unmount());
  });

  it('rings the focused title in the theme focus colour', async () => {
    mockFocused = true;
    const view = await render('TVScreen', boosted);
    const title = view.tree.root.find((n) => n.props.children === 'TV Screen' && n.props.style);
    const ring = require('react-native').StyleSheet.flatten(title.parent!.props.style);
    expect(ring.borderColor).toBe(view.theme.focus.borderColor);
    expect(ring.borderWidth).toBe(view.theme.focus.borderWidth);
    await view.act(async () => view.tree.unmount());
  });

  it.each([
    ['standard', standard],
    ['high-contrast', boosted],
  ])('keeps the title text %s centre 10 scaled px above the container centre, as before theming', async (_n, prefs) => {
    const view = await render('TVScreen', prefs);
    const { StyleSheet } = require('react-native');
    const text = view.textStyle('TV Screen');
    const ring = StyleSheet.flatten(
      view.tree.root.find((n) => n.props.children === 'TV Screen' && n.props.style).parent!.props.style,
    );
    const textHeight = 40;
    const border = ring.borderWidth ?? 0;
    const above = border + (text.marginTop ?? 0);
    const ringHeight = 2 * border + (text.marginTop ?? 0) + textHeight + (text.marginBottom ?? 0);
    const blockHeight = ringHeight + (ring.marginBottom ?? 0);
    expect(above + textHeight / 2 - blockHeight / 2).toBe(-view.scaledPixels(10));
    await view.act(async () => view.tree.unmount());
  });
});
