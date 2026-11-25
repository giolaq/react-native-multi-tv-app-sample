let React;
let act;
let create;
let StyleSheet;
let View;

let mockSetDuration;
let mockSetInitialized;

jest.mock(
  '@react-navigation/native',
  () => ({
    useNavigation: () => ({goBack: jest.fn()}),
    useRoute: () => ({params: {id: 'm'}}),
    useIsFocused: () => true,
  }),
  {virtual: true},
);
jest.mock('../../../packages/shared-ui/src/hooks/useMovie', () => ({
  useMovie: () => ({
    status: 'found',
    movie: {id: 'm', movie: 'm.mp4', headerImage: 'poster'},
  }),
}));
jest.mock(
  '@amazon-devices/react-native-w3cmedia',
  () => ({
    KeplerVideoSurfaceView: 'KeplerVideoSurfaceView',
    KeplerCaptionsView: 'KeplerCaptionsView',
    VideoPlayer: function VideoPlayer() {},
  }),
  {virtual: true},
);
jest.mock(
  '../../../packages/shared-ui/node_modules/@amazon-devices/react-native-kepler',
  () => ({
    useKeplerAppStateManager: () => ({getComponentInstance: () => ({})}),
  }),
);
jest.mock(
  '../../../packages/shared-ui/src/app/remote-control/RemoteControlManager',
  () => ({
    addKeydownListener: (listener) => listener,
    removeKeydownListener: () => {},
  }),
);
jest.mock('../../../packages/shared-ui/src/utils/VideoHandler.kepler', () => ({
  VideoHandler: function VideoHandler(
    _ref,
    _movie,
    _headerImage,
    setIsVideoInitialized,
    _setIsVideoEnded,
    _setIsVideoError,
    _setCurrentTime,
    setDuration,
  ) {
    mockSetInitialized = setIsVideoInitialized;
    mockSetDuration = setDuration;
    this.preBufferVideo = () => {};
    this.destroyVideoElements = () => {};
  },
}));

const shared = (path) => require(`../../../packages/shared-ui/src/${path}`);

beforeEach(() => {
  jest.resetModules();
  React = require('react');
  ({act, create} = require('react-test-renderer'));
  ({StyleSheet, View} = require('react-native'));
});

// The Vega player screen, with the overlay that appears once the video has a duration.
async function renderPlayingVega(preferences) {
  const PlayerScreen = shared('screens/PlayerScreen').default;
  const {AccessibilityProvider} = shared('components/AccessibilityContext');
  let tree;
  await act(async () => {
    tree = create(
      <AccessibilityProvider initialOverrides={preferences}>
        <PlayerScreen />
      </AccessibilityProvider>,
    );
  });
  await act(async () => {
    mockSetDuration(60);
    mockSetInitialized(true);
  });
  await act(async () => {});
  const flat = (node) => StyleSheet.flatten(node.props.style) || {};
  const scrim = tree.root.findAll(
    (n) => typeof n.type !== 'string' && flat(n).zIndex === 10,
  )[0];
  const views = scrim.findAllByType(View);
  const [track, thumb] = views.slice(-2).map(flat);
  return {tree, scrim: flat(scrim), track, thumb, flat};
}

it('draws the Vega overlay scrim and seek bar from the standard theme', async () => {
  const {colors} = shared('theme/colors');
  const view = await renderPlayingVega({});
  try {
    expect(view.scrim.backgroundColor).toBe(colors.scrimMedium);
    expect(view.track.backgroundColor).toBe(colors.progressTrack);
    expect(view.thumb.backgroundColor).toBe(colors.text);
  } finally {
    await act(async () => view.tree.unmount());
  }
});

it('draws the Vega overlay with high-contrast colours and larger control text', async () => {
  const {highContrastColors} = shared('theme/accessibility');
  const {scaledPixels} = shared('hooks/useScale');
  const {blend, contrastRatio} = shared('theme/contrast');
  const view = await renderPlayingVega({highContrast: true, largerText: true});
  try {
    expect(view.scrim.backgroundColor).toBe(highContrastColors.scrimMedium);
    expect(view.track.backgroundColor).toBe(highContrastColors.progressTrack);
    expect(view.thumb.backgroundColor).toBe(highContrastColors.text);

    const alpha = Number(/([\d.]+)\)$/.exec(view.scrim.backgroundColor)[1]);
    for (const video of ['#000000', '#FFFFFF']) {
      const surface = blend('#000000', video, alpha);
      expect(
        contrastRatio(view.track.backgroundColor, surface),
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrastRatio(view.thumb.backgroundColor, surface),
      ).toBeGreaterThanOrEqual(3);
    }
    expect(
      contrastRatio(view.thumb.backgroundColor, view.track.backgroundColor),
    ).toBeGreaterThanOrEqual(3);

    const label = view.tree.root.find(
      (n) => typeof n.type === 'string' && n.props.children === 'Pause',
    );
    expect(view.flat(label).fontSize).toBe(scaledPixels(24 * 1.25));
  } finally {
    await act(async () => view.tree.unmount());
  }
});
