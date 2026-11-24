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
let mockRouteParams = {};
let mockScreenFocused = true;
const mockVideoHandler = jest.fn();

jest.mock(
  '@react-navigation/native',
  () => ({
    DrawerActions: {openDrawer: () => ({type: 'OPEN_DRAWER'})},
    useNavigation: () => mockNavigation,
    useRoute: () => ({params: mockRouteParams}),
    useIsFocused: () => mockScreenFocused,
  }),
  {virtual: true},
);
jest.mock('../../../packages/shared-ui/src/components/MenuContext', () => ({
  useMenuContext: () => ({isOpen: false, toggleMenu: jest.fn()}),
}));
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
// Shared UI resolves its own copy of the Kepler package.
jest.mock('../../../packages/shared-ui/node_modules/@amazon-devices/react-native-kepler', () => ({
  useKeplerAppStateManager: () => ({getComponentInstance: () => ({})}),
}));
jest.mock('../../../packages/shared-ui/src/app/remote-control/RemoteControlManager', () => ({
  addKeydownListener: (listener) => listener,
  removeKeydownListener: () => {},
}));
jest.mock(
  '../../../packages/shared-ui/src/utils/VideoHandler.kepler',
  () => ({
    VideoHandler: function VideoHandler(_ref, movie, headerImage) {
      mockVideoHandler(movie, headerImage);
      this.preBufferVideo = () => {};
      this.destroyVideoElements = () => {};
    },
  }),
);

const film = (id, title) => ({
  id,
  title,
  description: `${title} synopsis`,
  headerImage: `${title}.jpg`,
  movie: `${title}.mp4`,
  releaseYear: 2024,
  trending: true,
});

const catalog = [film('first', 'First'), film(7, 'Seventh')];

beforeEach(() => {
  jest.resetModules();
  React = require('react');
  ({act, create} = require('react-test-renderer'));
  ({SpatialNavigation} = require('react-tv-space-navigation'));
  ({fetchMoviesData} = require('../../../packages/shared-ui/src/data/moviesData'));
  mockNavigation.navigate.mockClear();
  mockNavigation.goBack.mockClear();
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

const screen = (name) =>
  require(`../../../packages/shared-ui/src/screens/${name}`).default;

async function render(Screen) {
  const press = configureRemote();
  let tree;
  await act(async () => {
    tree = create(<Screen />);
  });
  return {tree, press};
}

const shows = (tree, text) =>
  tree.root.findAll(
    (node) => typeof node.type === 'string' && node.props.children === text,
  ).length > 0;

it('opens Details from a Home card with only its id and keeps that card selected after Back', async () => {
  fetchMoviesData.mockResolvedValue(catalog);
  const Home = screen('HomeScreen');
  const {tree, press} = await render(Home);
  try {
    await press('right');
    await press('enter');
    expect(mockNavigation.navigate).toHaveBeenLastCalledWith('Details', {id: 7});

    mockScreenFocused = false;
    await act(async () => tree.update(<Home />));
    mockScreenFocused = true;
    await act(async () => tree.update(<Home />));
    await press('enter');
    expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
    expect(mockNavigation.navigate).toHaveBeenLastCalledWith('Details', {id: 7});
  } finally {
    await act(async () => tree.unmount());
  }
});

it('opens Details from Explore with only the id', async () => {
  fetchMoviesData.mockResolvedValue(catalog);
  const {tree, press} = await render(screen('ExploreScreen'));
  try {
    await press('enter');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Details', {id: 'first'});
  } finally {
    await act(async () => tree.unmount());
  }
});

it('shows the title for a deep-linked string id and opens Player with the same id', async () => {
  fetchMoviesData.mockResolvedValue(catalog);
  mockRouteParams = {id: '7'};
  const {tree, press} = await render(screen('DetailsScreen'));
  try {
    expect(shows(tree, 'Seventh')).toBe(true);
    expect(shows(tree, 'First')).toBe(false);
    await press('enter');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Player', {id: 7});
  } finally {
    await act(async () => tree.unmount());
  }
});

it('shows a loader until the catalog arrives, then the title', async () => {
  let resolve;
  fetchMoviesData.mockReturnValue(new Promise((r) => (resolve = r)));
  mockRouteParams = {id: 'first'};
  const {tree} = await render(screen('DetailsScreen'));
  try {
    expect(tree.root.findAllByType(require('react-native').ActivityIndicator)).toHaveLength(1);
    expect(shows(tree, 'First')).toBe(false);
    await act(async () => resolve(catalog));
    expect(shows(tree, 'First')).toBe(true);
  } finally {
    await act(async () => tree.unmount());
  }
});

it('offers Retry when the catalog fails, then shows the title', async () => {
  fetchMoviesData
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(catalog);
  mockRouteParams = {id: 'first'};
  const {tree, press} = await render(screen('DetailsScreen'));
  try {
    expect(shows(tree, 'Retry')).toBe(true);
    await press('enter');
    expect(shows(tree, 'First')).toBe(true);
  } finally {
    await act(async () => tree.unmount());
  }
});

it('shows not-found for an unknown id and leaves it with Back', async () => {
  fetchMoviesData.mockResolvedValue(catalog);
  mockRouteParams = {id: 'missing'};
  const {tree, press} = await render(screen('DetailsScreen'));
  try {
    expect(shows(tree, 'This title is not available.')).toBe(true);
    await press('enter');
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => tree.unmount());
  }
});

it('plays the stream URL of the movie whose id the Vega player receives', async () => {
  fetchMoviesData.mockResolvedValue(catalog);
  mockRouteParams = {id: '7'};
  const {tree} = await render(screen('PlayerScreen.vega'));
  try {
    expect(mockVideoHandler).toHaveBeenCalledWith('Seventh.mp4', 'Seventh.jpg');
  } finally {
    await act(async () => tree.unmount());
  }
});
