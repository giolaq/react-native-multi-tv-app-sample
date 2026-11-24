let React;
let act;
let create;
let SpatialNavigation;
let I18nManager;
let HomeScreen;
let fetchMoviesData;

beforeEach(() => {
  jest.resetModules();
  React = require('react');
  ({act, create} = require('react-test-renderer'));
  ({I18nManager} = require('react-native'));
  ({SpatialNavigation} = require('react-tv-space-navigation'));
  HomeScreen =
    require('../../../packages/shared-ui/src/screens/HomeScreen').default;
  ({
    fetchMoviesData,
  } = require('../../../packages/shared-ui/src/data/moviesData'));
  mockNavigation.dispatch.mockClear();
  mockToggleMenu.mockClear();
});

const mockNavigation = {dispatch: jest.fn(), navigate: jest.fn()};
const mockToggleMenu = jest.fn();

jest.mock(
  '@react-navigation/native',
  () => ({
    DrawerActions: {openDrawer: () => ({type: 'OPEN_DRAWER'})},
    useNavigation: () => mockNavigation,
    useIsFocused: () => true,
  }),
  {virtual: true},
);
jest.mock('../../../packages/shared-ui/src/components/MenuContext', () => ({
  useMenuContext: () => ({isOpen: false, toggleMenu: mockToggleMenu}),
}));
jest.mock('../../../packages/shared-ui/src/data/moviesData', () => ({
  fetchMoviesData: jest.fn(),
}));

const film = (id, releaseYear, trending) => ({
  id,
  title: `${id} title`,
  description: `${id} synopsis`,
  headerImage: `${id}.jpg`,
  movie: `${id}.mp4`,
  releaseYear,
  trending,
});

const catalog = [
  film('fresh', 2023, false),
  film('hit', 2024, true),
  film('oldie', 2020, true),
  film('vintage', 2019, false),
];

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

const texts = (tree) =>
  tree.root
    .findAll(
      (node) =>
        typeof node.type === 'string' &&
        typeof node.props.children === 'string',
    )
    .map((node) => node.props.children);
const headerTitle = (tree) =>
  texts(tree).find((text) => text.endsWith(' title')) ?? null;
const drawerOpens = () => mockNavigation.dispatch.mock.calls.length;

async function renderHome() {
  fetchMoviesData.mockResolvedValue(catalog);
  const press = configureRemote();
  let tree;
  await act(async () => {
    tree = create(<HomeScreen />);
  });
  return {tree, press};
}

it('shows one titled row per rule with only the matching titles', async () => {
  const {tree} = await renderHome();
  try {
    expect(
      texts(tree).filter((text) =>
        ['Trending Movies', 'New Releases', 'From the Archive'].includes(text),
      ),
    ).toEqual(['Trending Movies', 'New Releases', 'From the Archive']);
    expect(texts(tree)).not.toContain('Classics');
    expect(texts(tree)).not.toContain('Hip and Modern');
  } finally {
    await act(async () => tree.unmount());
  }
});

it('shows the focused card of whichever row has focus and opens the drawer only from a first card', async () => {
  const {tree, press} = await renderHome();
  try {
    expect(headerTitle(tree)).toBe('hit title');

    await press('right');
    expect(headerTitle(tree)).toBe('oldie title');
    await press('left');
    expect(headerTitle(tree)).toBe('hit title');
    expect(drawerOpens()).toBe(0);
    await press('left');
    expect(drawerOpens()).toBe(1);

    await press('down');
    expect(headerTitle(tree)).toBe('fresh title');
    await press('right');
    expect(headerTitle(tree)).toBe('hit title');
    await press('left');
    expect(drawerOpens()).toBe(1);
    await press('left');
    expect(drawerOpens()).toBe(2);

    await press('down');
    expect(headerTitle(tree)).toBe('oldie title');
    await press('left');
    expect(drawerOpens()).toBe(3);

    await press('up');
    expect(headerTitle(tree)).toBe('fresh title');
    expect(mockToggleMenu).toHaveBeenCalledWith(true);
  } finally {
    await act(async () => tree.unmount());
  }
});

it('in RTL opens the drawer on Right only when the first card of a row has focus', async () => {
  const rtl = jest.replaceProperty(I18nManager, 'isRTL', true);
  fetchMoviesData.mockResolvedValue([film('solo', 2024, true)]);
  const press = configureRemote();
  let tree;
  await act(async () => {
    tree = create(<HomeScreen />);
  });
  try {
    await press('left');
    expect(drawerOpens()).toBe(0);
    await press('right');
    expect(drawerOpens()).toBe(1);
  } finally {
    rtl.restore();
    await act(async () => tree.unmount());
  }
});

it('in RTL keeps the drawer closed on Right from a later card', async () => {
  const rtl = jest.replaceProperty(I18nManager, 'isRTL', true);
  const {tree, press} = await renderHome();
  try {
    await press('right');
    expect(headerTitle(tree)).toBe('oldie title');
    await press('right');
    expect(drawerOpens()).toBe(0);
  } finally {
    rtl.restore();
    await act(async () => tree.unmount());
  }
});
