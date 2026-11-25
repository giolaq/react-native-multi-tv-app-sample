let React;
let act;
let create;
let SpatialNavigation;
let fetchMoviesData;

const mockNavigation = {
  dispatch: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
};
const mockHandlers = [];

jest.mock(
  '@react-navigation/native',
  () => ({
    useNavigation: () => mockNavigation,
    useRoute: () => ({params: {id: '7'}}),
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
    addKeydownListener: (listener) => listener,
    removeKeydownListener: () => {},
  }),
);
// Each VideoHandler records the stream it plays and exposes the error setter
// the player gives it, so a test can fail playback the way a stream error does.
jest.mock('../../../packages/shared-ui/src/utils/VideoHandler.kepler', () => ({
  VideoHandler: function VideoHandler(
    _ref,
    movie,
    headerImage,
    _setInitialized,
    _setEnded,
    setIsVideoError,
  ) {
    this.movie = movie;
    this.fail = () => setIsVideoError(true);
    this.preBufferVideo = jest.fn();
    this.destroyVideoElements = jest.fn();
    mockHandlers.push(this);
  },
}));

const catalog = [
  {
    id: 7,
    title: 'Seventh',
    description: 'Seventh synopsis',
    headerImage: 'Seventh.jpg',
    movie: 'Seventh.mp4',
    releaseYear: 2024,
    trending: true,
  },
];

beforeEach(() => {
  jest.resetModules();
  React = require('react');
  ({act, create} = require('react-test-renderer'));
  ({SpatialNavigation} = require('react-tv-space-navigation'));
  ({
    fetchMoviesData,
  } = require('../../../packages/shared-ui/src/data/moviesData'));
  fetchMoviesData.mockResolvedValue(catalog);
  mockNavigation.goBack.mockClear();
  mockHandlers.length = 0;
});

function configureRemote() {
  const listeners = new Set();
  SpatialNavigation.configureRemoteControl({
    remoteControlSubscriber: (callback) => {
      listeners.add(callback);
      return callback;
    },
    remoteControlUnsubscriber: (callback) => listeners.delete(callback),
  });
  return async (direction) => {
    await act(async () => {
      [...listeners].forEach((callback) => callback(direction));
    });
  };
}

async function renderPlayer() {
  const press = configureRemote();
  const Player =
    require('../../../packages/shared-ui/src/screens/PlayerScreen.vega').default;
  let tree;
  await act(async () => {
    tree = create(<Player />);
  });
  return {tree, press};
}

const ERROR_TEXT = 'Unable to play this video.';
const findText = (tree, text) =>
  tree.root.findAll(
    (node) => typeof node.type === 'string' && node.props.children === text,
  );

async function failPlayback(handler) {
  await act(async () => handler.fail());
}

it('announces the failure and offers Retry and Back', async () => {
  const {tree} = await renderPlayer();
  try {
    await failPlayback(mockHandlers[0]);
    const [message] = findText(tree, ERROR_TEXT);
    expect(message.props.accessibilityRole).toBe('alert');
    expect(findText(tree, 'Retry')).not.toHaveLength(0);
    expect(findText(tree, 'Back')).not.toHaveLength(0);
  } finally {
    await act(async () => tree.unmount());
  }
});

it('tears down the failed handler and starts the same stream again on Retry', async () => {
  const {tree, press} = await renderPlayer();
  try {
    const failed = mockHandlers[0];
    await failPlayback(failed);
    await press('enter');

    expect(failed.destroyVideoElements).toHaveBeenCalled();
    expect(mockHandlers).toHaveLength(2);
    expect(mockHandlers[1].movie).toBe('Seventh.mp4');
    expect(mockHandlers[1].preBufferVideo).toHaveBeenCalledTimes(1);
    expect(findText(tree, ERROR_TEXT)).toHaveLength(0);
    expect(mockNavigation.goBack).not.toHaveBeenCalled();

    // A second failure shows the panel again and a second Retry still works.
    await failPlayback(mockHandlers[1]);
    expect(findText(tree, ERROR_TEXT)).not.toHaveLength(0);
    await press('enter');
    expect(mockHandlers[1].destroyVideoElements).toHaveBeenCalled();
    expect(mockHandlers).toHaveLength(3);
    expect(mockHandlers[2].preBufferVideo).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => tree.unmount());
  }
});

it('returns to Details with Back without starting playback again', async () => {
  const {tree, press} = await renderPlayer();
  try {
    await failPlayback(mockHandlers[0]);
    await press('down');
    await press('enter');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(mockHandlers[0].destroyVideoElements).toHaveBeenCalled();
    expect(mockHandlers).toHaveLength(1);
  } finally {
    await act(async () => tree.unmount());
  }
});
