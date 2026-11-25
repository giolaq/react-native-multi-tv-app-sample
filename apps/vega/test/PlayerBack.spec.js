let React;
let act;
let create;
let BackHandler;
let fetchMoviesData;

const mockNavigation = {goBack: jest.fn()};
const mockDestroyVideoElements = jest.fn();
const mockKeyListeners = new Set();
let mockSetVideoEnded;

jest.mock(
  '@react-navigation/native',
  () => ({
    useNavigation: () => mockNavigation,
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
    addKeydownListener: (listener) => {
      mockKeyListeners.add(listener);
      return listener;
    },
    removeKeydownListener: (listener) => mockKeyListeners.delete(listener),
  }),
);
jest.mock('../../../packages/shared-ui/src/utils/VideoHandler.kepler', () => ({
  VideoHandler: function VideoHandler(_ref, _movie, _image, _init, setEnded) {
    mockSetVideoEnded = setEnded;
    this.preBufferVideo = () => {};
    this.destroyVideoElements = mockDestroyVideoElements;
  },
}));

let backPressListeners;

beforeEach(() => {
  jest.resetModules();
  React = require('react');
  ({act, create} = require('react-test-renderer'));
  ({BackHandler} = require('react-native'));
  ({
    fetchMoviesData,
  } = require('../../../packages/shared-ui/src/data/moviesData'));
  fetchMoviesData.mockResolvedValue([
    {
      id: 'first',
      title: 'First',
      description: 'First synopsis',
      headerImage: 'First.jpg',
      movie: 'First.mp4',
      releaseYear: 2024,
      trending: true,
    },
  ]);
  backPressListeners = new Set();
  jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_event, listener) => {
      backPressListeners.add(listener);
      return {remove: () => backPressListeners.delete(listener)};
    });
  mockNavigation.goBack.mockClear();
  mockDestroyVideoElements.mockClear();
  mockKeyListeners.clear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderPlayer() {
  const Player =
    require('../../../packages/shared-ui/src/screens/PlayerScreen.vega').default;
  let tree;
  await act(async () => {
    tree = create(<Player />);
  });
  // The catalog loads with real timers. Fake them for the exit delay.
  jest.useFakeTimers();
  return tree;
}

const {
  SupportedKeys,
} = require('../../../packages/shared-ui/src/app/remote-control/SupportedKeys');

function pressRemoteBack() {
  act(() => {
    [...mockKeyListeners].forEach((listener) => listener(SupportedKeys.Back));
  });
}

function pressHardwareBack() {
  act(() => {
    [...backPressListeners].forEach((listener) => listener());
  });
}

function waitPastExitDelay() {
  act(() => {
    jest.advanceTimersByTime(1000);
  });
}

it('leaves the player once when one Back press reaches both listeners', async () => {
  const tree = await renderPlayer();
  expect(mockKeyListeners.size).toBe(1);
  expect(backPressListeners.size).toBe(1);

  pressRemoteBack();
  pressHardwareBack();
  waitPastExitDelay();

  expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  expect(mockDestroyVideoElements).toHaveBeenCalledTimes(1);

  act(() => tree.unmount());
  expect(mockDestroyVideoElements).toHaveBeenCalledTimes(1);
});

it('leaves the player once after repeated Back presses', async () => {
  const tree = await renderPlayer();

  pressHardwareBack();
  pressRemoteBack();
  pressRemoteBack();
  pressHardwareBack();
  waitPastExitDelay();

  expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  expect(mockDestroyVideoElements).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

it('does not navigate after the player unmounts during the exit delay', async () => {
  const tree = await renderPlayer();

  pressRemoteBack();
  act(() => tree.unmount());
  waitPastExitDelay();

  expect(mockNavigation.goBack).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

it('leaves the player once when Back is pressed after the video ends', async () => {
  const tree = await renderPlayer();

  act(() => mockSetVideoEnded(true));
  pressRemoteBack();
  pressHardwareBack();
  waitPastExitDelay();

  expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  expect(mockDestroyVideoElements).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
