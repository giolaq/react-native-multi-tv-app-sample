let React;
let act;
let create;
let SpatialNavigation;
let fetchMoviesData;
let PlaybackPositionProvider;
let createPositionStore;

const mockNavigation = {
  dispatch: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
};
let mockRouteParams = {};
let mockScreenFocused = true;
const mockVideoHandler = jest.fn();

jest.mock(
  '@react-navigation/native',
  () => ({
    useNavigation: () => mockNavigation,
    useRoute: () => ({params: mockRouteParams}),
    useIsFocused: () => mockScreenFocused,
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
// The overlay animates once a duration is known. Its controls are outside this test.
jest.mock(
  '../../../packages/shared-ui/src/components/player/VideoOverlay.vega',
  () => () => null,
);
jest.mock('../../../packages/shared-ui/src/utils/VideoHandler.kepler', () => ({
  VideoHandler: function VideoHandler(...args) {
    mockVideoHandler(...args);
    this.preBufferVideo = () => {};
    this.destroyVideoElements = () => {};
  },
}));

const catalog = [
  {
    id: 7,
    title: 'Seventh',
    description: 'Seventh synopsis',
    headerImage: 'Seventh.jpg',
    movie: 'Seventh.mp4',
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
  ({
    PlaybackPositionProvider,
  } = require('../../../packages/shared-ui/src/components/PlaybackPositionContext'));
  ({
    createPositionStore,
  } = require('../../../packages/shared-ui/src/data/positionStore'));
  fetchMoviesData.mockResolvedValue(catalog);
  mockNavigation.navigate.mockClear();
  mockVideoHandler.mockClear();
  mockScreenFocused = true;
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

async function savedStore(saved = []) {
  const store = createPositionStore({
    read: () => JSON.stringify(saved),
    write: () => {},
  });
  await store.loaded;
  return store;
}

async function render(name, store) {
  const Screen = require(
    `../../../packages/shared-ui/src/screens/${name}`,
  ).default;
  const press = configureRemote();
  const element = () => (
    <PlaybackPositionProvider store={store}>
      <Screen />
    </PlaybackPositionProvider>
  );
  let tree;
  await act(async () => {
    tree = create(element());
  });
  const rerender = () => act(async () => tree.update(element()));
  return {tree, press, rerender};
}

const shows = (tree, text) =>
  tree.root.findAll(
    (node) => typeof node.type === 'string' && node.props.children === text,
  ).length > 0;

it('offers Resume with default focus and Start over below it when a position is saved', async () => {
  mockRouteParams = {id: '7'};
  const store = await savedStore([['7', 125]]);
  const {tree, press} = await render('DetailsScreen', store);
  try {
    expect(shows(tree, 'Resume')).toBe(true);
    expect(shows(tree, 'Start over')).toBe(true);
    expect(shows(tree, 'Watch now')).toBe(false);
    await press('enter');
    expect(mockNavigation.navigate).toHaveBeenLastCalledWith('Player', {
      id: 7,
      startTime: 125,
    });
    await press('down');
    await press('enter');
    expect(mockNavigation.navigate).toHaveBeenLastCalledWith('Player', {
      id: 7,
      startTime: 0,
    });
    await press('up');
    await press('enter');
    expect(mockNavigation.navigate).toHaveBeenLastCalledWith('Player', {
      id: 7,
      startTime: 125,
    });
  } finally {
    await act(async () => tree.unmount());
  }
});

it('offers only Watch now without a saved position, and Resume after the player saves one', async () => {
  mockRouteParams = {id: 7};
  const store = await savedStore();
  const {tree, press} = await render('DetailsScreen', store);
  try {
    expect(shows(tree, 'Watch now')).toBe(true);
    expect(shows(tree, 'Start over')).toBe(false);
    await press('enter');
    expect(mockNavigation.navigate).toHaveBeenLastCalledWith('Player', {
      id: 7,
    });

    // Back from the player: the position arrives while Details shows, and focus stays on the
    // first button, now Resume.
    await act(async () => store.save(7, 300, 600));
    expect(shows(tree, 'Resume')).toBe(true);
    await press('enter');
    expect(mockNavigation.navigate).toHaveBeenLastCalledWith('Player', {
      id: 7,
      startTime: 300,
    });

    await act(async () => store.save(7, 590, 600));
    expect(shows(tree, 'Watch now')).toBe(true);
    expect(shows(tree, 'Start over')).toBe(false);
  } finally {
    await act(async () => tree.unmount());
  }
});

it('starts the Vega player at the start time and saves the position when the viewer leaves', async () => {
  mockRouteParams = {id: '7', startTime: 125};
  const store = await savedStore([['7', 125]]);
  const {tree, rerender} = await render('PlayerScreen.vega', store);
  try {
    expect(mockVideoHandler).toHaveBeenCalledTimes(1);
    const args = mockVideoHandler.mock.calls[0];
    expect(args[1]).toBe('Seventh.mp4');
    expect(args[9]).toBe(125);
    const [setCurrentTime, setDuration] = [args[6], args[7]];
    await act(async () => {
      setDuration(600);
      setCurrentTime(200);
    });
    mockScreenFocused = false;
    await rerender();
    expect(store.get(7)).toBe(200);
  } finally {
    await act(async () => tree.unmount());
  }
});

it('keeps the position when the Vega player is left during the load and clears it at the end', async () => {
  mockRouteParams = {id: 7, startTime: 125};
  const store = await savedStore([['7', 125]]);
  const first = await render('PlayerScreen.vega', store);
  mockScreenFocused = false;
  await first.rerender();
  await act(async () => first.tree.unmount());
  expect(store.get(7)).toBe(125);

  mockScreenFocused = true;
  mockVideoHandler.mockClear();
  const second = await render('PlayerScreen.vega', store);
  try {
    const args = mockVideoHandler.mock.calls[0];
    await act(async () => {
      args[7](600);
      args[6](600);
      args[4](true);
    });
    mockScreenFocused = false;
    await second.rerender();
    expect(store.get(7)).toBeUndefined();
  } finally {
    await act(async () => second.tree.unmount());
  }
});
