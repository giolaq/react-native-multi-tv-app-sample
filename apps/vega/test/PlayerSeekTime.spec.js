let React;
let act;
let create;
let fetchMoviesData;
let SupportedKeys;

let mockKeyListener;
let mockPlayback;
const mockSeek = jest.fn();

jest.mock(
  '@react-navigation/native',
  () => ({
    useNavigation: () => ({goBack: jest.fn()}),
    useRoute: () => ({params: {id: 'first'}}),
    useIsFocused: () => true,
  }),
  {virtual: true},
);
jest.mock('../../../packages/shared-ui/src/data/moviesData', () => ({
  fetchMoviesData: jest.fn(),
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
    addKeydownListener: (listener) => (mockKeyListener = listener),
    removeKeydownListener: () => {},
  }),
);
jest.mock('../../../packages/shared-ui/src/utils/VideoHandler.kepler', () => ({
  VideoHandler: function VideoHandler(
    _ref,
    _movie,
    _headerImage,
    setInitialized,
    _setEnded,
    _setError,
    setCurrentTime,
    setDuration,
  ) {
    mockPlayback = {setInitialized, setCurrentTime, setDuration};
    this.seek = mockSeek;
    this.preBufferVideo = () => {};
    this.destroyVideoElements = () => {};
  },
}));

beforeEach(() => {
  jest.resetModules();
  React = require('react');
  ({act, create} = require('react-test-renderer'));
  ({
    fetchMoviesData,
  } = require('../../../packages/shared-ui/src/data/moviesData'));
  ({
    SupportedKeys,
  } = require('../../../packages/shared-ui/src/app/remote-control/SupportedKeys'));
  mockSeek.mockClear();
});

const shownTimes = (tree) =>
  tree.root
    .findAll(
      (node) =>
        typeof node.type === 'string' &&
        typeof node.props.children === 'string',
    )
    .map((node) => node.props.children)
    .filter((text) => / \/ /.test(text));

it('shows elapsed and total time on the Vega player and updates them on every seek key', async () => {
  fetchMoviesData.mockResolvedValue([
    {id: 'first', title: 'First', headerImage: 'f.jpg', movie: 'f.mp4'},
  ]);
  const PlayerScreen =
    require('../../../packages/shared-ui/src/screens/PlayerScreen.vega').default;
  let tree;
  await act(async () => {
    tree = create(<PlayerScreen />);
  });
  try {
    await act(async () => {
      mockPlayback.setInitialized(true);
      mockPlayback.setDuration(5590);
      mockPlayback.setCurrentTime(724);
    });
    expect(shownTimes(tree)).toEqual(['12:04 / 1:33:10']);

    const after = async (key) => {
      await act(async () => mockKeyListener(key));
      return shownTimes(tree);
    };
    expect(await after(SupportedKeys.Right)).toEqual(['12:14 / 1:33:10']);
    expect(await after(SupportedKeys.FastForward)).toEqual(['12:24 / 1:33:10']);
    expect(await after(SupportedKeys.Left)).toEqual(['12:14 / 1:33:10']);
    expect(await after(SupportedKeys.Rewind)).toEqual(['12:04 / 1:33:10']);
    expect(mockSeek.mock.calls.flat()).toEqual([734, 744, 734, 724]);
  } finally {
    await act(async () => tree.unmount());
  }
});
