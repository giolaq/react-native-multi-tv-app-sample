import React from 'react';
import { ActivityIndicator, Animated, I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import PlayerScreen from '../../../packages/shared-ui/src/screens/PlayerScreen';
import VideoOverlay from '../../../packages/shared-ui/src/components/player/VideoOverlay';
import VegaVideoOverlay from '../../../packages/shared-ui/src/components/player/VideoOverlay.vega';
import { scaledPixels } from '../../../packages/shared-ui/src/hooks/useScale';
import { colors } from '../../../packages/shared-ui/src/theme/colors';
import { highContrastColors, type AccessibilityPreferences } from '../../../packages/shared-ui/src/theme/accessibility';
import { blend, contrastRatio } from '../../../packages/shared-ui/src/theme/contrast';

// React Native loads these on first access. Loading them here keeps that cold cost out of the first test's timeout.
void [ActivityIndicator, Animated.View, I18nManager, Pressable, Text, View];

let mockPreferences: AccessibilityPreferences;
let mockVideoProps: { onError: () => void };

jest.mock('../../../packages/shared-ui/src/hooks/useMovie', () => ({
  useMovie: () => ({ status: 'found', movie: { id: 'm', movie: 'm.mp4', headerImage: 'poster' } }),
}));
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: { id: 'm' } }),
}));
jest.mock('react-tv-space-navigation', () => ({
  SpatialNavigationRoot: 'SpatialRoot',
  SpatialNavigationNode: 'SpatialNode',
  SpatialNavigationFocusableView: ({ children }: { children: (state: { isFocused: boolean }) => unknown }) =>
    children({ isFocused: false }),
  DefaultFocus: 'DefaultFocus',
}));
jest.mock('../../../packages/shared-ui/src/components/player/VideoPlayer', () =>
  require('react').forwardRef((props: typeof mockVideoProps, _ref: unknown) => {
    mockVideoProps = props;
    return null;
  }),
);
jest.mock('../../../packages/shared-ui/src/app/remote-control/RemoteControlManager', () => ({
  addKeydownListener: jest.fn((listener) => listener),
  removeKeydownListener: jest.fn(),
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
const highContrast: AccessibilityPreferences = { highContrast: true, largerText: false, reduceMotion: false };
const largerText: AccessibilityPreferences = { highContrast: false, largerText: true, reduceMotion: false };
const both: AccessibilityPreferences = { highContrast: true, largerText: true, reduceMotion: false };

const flat = (node: TestRenderer.ReactTestInstance) => StyleSheet.flatten(node.props.style);

/** The solid colour of a black `rgba(0, 0, 0, a)` scrim over the given video pixel. */
const scrimOver = (scrim: string, video: string) => {
  const match = /^rgba\(0, 0, 0, ([\d.]+)\)$/.exec(scrim);
  if (!match) throw new Error(`Expected a black rgba scrim, got "${scrim}"`);
  return blend('#000000', video, Number(match[1]));
};

async function renderErrorPanel(preferences: AccessibilityPreferences) {
  mockPreferences = preferences;
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(<PlayerScreen />);
  });
  await TestRenderer.act(async () => mockVideoProps.onError());
  return tree;
}

async function renderOverlay(Overlay: typeof VideoOverlay, preferences: AccessibilityPreferences) {
  mockPreferences = preferences;
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <Overlay visible paused onPlayPause={jest.fn()} onExit={jest.fn()} currentTime={30} duration={60} />,
    );
  });
  const views = tree.root.findAllByType(View);
  // The scrim is the overlay's root view; the seek bar's track and thumb are its last two views.
  const scrim = flat(tree.root.findAll((n) => flat(n)?.zIndex === 10)[0]);
  const [track, thumb] = views.slice(-2).map(flat);
  const playText = flat(tree.root.find((n) => n.props.children === 'Play' && n.props.style));
  return { tree, scrim, track, thumb, playText };
}

describe('Player error panel theme', () => {
  it.each([
    ['standard', standard, colors, 32],
    ['high contrast', highContrast, highContrastColors, 32],
    ['larger text', largerText, colors, 40],
    ['high contrast and larger text', both, highContrastColors, 40],
  ])('draws the error text in the %s theme', async (_name, preferences, palette, size) => {
    const tree = await renderErrorPanel(preferences);
    try {
      const text = tree.root.find((n) => n.props.accessibilityRole === 'alert');
      expect(flat(text)).toMatchObject({ color: palette.text, fontSize: scaledPixels(size) });
      const panel = flat(text.parent!);
      expect(panel.backgroundColor).toBe(palette.background);
      expect(contrastRatio(palette.text, panel.backgroundColor as string)).toBeGreaterThanOrEqual(7);
    } finally {
      await TestRenderer.act(async () => tree.unmount());
    }
  });
});

describe.each([
  ['Expo', VideoOverlay],
  ['Vega', VegaVideoOverlay],
])('%s video overlay theme', (_platform, Overlay) => {
  it('keeps the standard seek bar look with every switch off', async () => {
    const view = await renderOverlay(Overlay, standard);
    try {
      expect(view.scrim.backgroundColor).toBe(colors.scrimMedium);
      expect(view.track.backgroundColor).toBe('#888888');
      expect(view.thumb.backgroundColor).toBe(colors.text);
      expect(view.playText.fontSize).toBe(scaledPixels(24));
    } finally {
      await TestRenderer.act(async () => view.tree.unmount());
    }
  });

  it('uses the high-contrast scrim, track and thumb', async () => {
    const view = await renderOverlay(Overlay, highContrast);
    try {
      expect(view.scrim.backgroundColor).toBe(highContrastColors.scrimMedium);
      expect(view.track.backgroundColor).toBe(highContrastColors.progressTrack);
      expect(view.thumb.backgroundColor).toBe(highContrastColors.text);
    } finally {
      await TestRenderer.act(async () => view.tree.unmount());
    }
  });

  it.each([
    ['black', '#000000'],
    ['white', '#FFFFFF'],
  ])(
    'in high contrast, keeps the track and thumb at 3:1 (WCAG 1.4.11) over %s video and from each other',
    async (_name, video) => {
      const view = await renderOverlay(Overlay, highContrast);
      try {
        const surface = scrimOver(view.scrim.backgroundColor as string, video);
        const track = view.track.backgroundColor as string;
        const thumb = view.thumb.backgroundColor as string;
        expect(contrastRatio(track, surface)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(thumb, surface)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(thumb, track)).toBeGreaterThanOrEqual(3);
      } finally {
        await TestRenderer.act(async () => view.tree.unmount());
      }
    },
  );

  it('makes the control labels 25% larger with larger text', async () => {
    const view = await renderOverlay(Overlay, both);
    try {
      expect(view.playText).toMatchObject({ color: highContrastColors.text, fontSize: scaledPixels(24 * 1.25) });
    } finally {
      await TestRenderer.act(async () => view.tree.unmount());
    }
  });
});
