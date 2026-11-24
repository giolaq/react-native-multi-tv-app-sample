import React from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {act, create} from 'react-test-renderer';
import {SpatialNavigation} from 'react-tv-space-navigation';
import ExploreScreen from '../../../packages/shared-ui/src/screens/ExploreScreen';
import {createCatalogStore} from '../../../packages/shared-ui/src/data/catalogStore';
import {fetchMoviesData} from '../../../packages/shared-ui/src/data/moviesData';

// React Native loads these on first access. Loading them here keeps that cold cost out of the first test's timeout.
void [Animated, Easing, Image, Pressable, ScrollView, Text, View];

// A fresh store per test, instead of resetting every module and reloading React Native inside each test.
const mockStore = {};
jest.mock('../../../packages/shared-ui/src/data/catalogStore', () =>
  Object.defineProperty(
    {
      ...jest.requireActual(
        '../../../packages/shared-ui/src/data/catalogStore',
      ),
    },
    'catalogStore',
    {get: () => mockStore.current},
  ),
);

beforeEach(() => {
  fetchMoviesData.mockReset();
  mockStore.current = createCatalogStore(fetchMoviesData);
});

const mockNavigation = {dispatch: jest.fn(), navigate: jest.fn()};
const mockToggleMenu = jest.fn();
let mockScreenFocused = true;

jest.mock(
  '@react-navigation/native',
  () => ({
    DrawerActions: {openDrawer: () => ({type: 'OPEN_DRAWER'})},
    useNavigation: () => mockNavigation,
    useIsFocused: () => mockScreenFocused,
  }),
  {virtual: true},
);
jest.mock('../../../packages/shared-ui/src/components/MenuContext', () => ({
  useMenuContext: () => ({isOpen: false, toggleMenu: mockToggleMenu}),
}));
jest.mock('../../../packages/shared-ui/src/data/moviesData', () => ({
  fetchMoviesData: jest.fn(),
}));

const movies = [
  {
    id: '1',
    title: 'First film',
    description: 'First synopsis',
    movie: 'one.mp4',
    headerImage: 'one.jpg',
  },
  {
    id: '2',
    title: 'Second film',
    description: 'Second synopsis',
    movie: 'two.mp4',
    headerImage: 'two.jpg',
  },
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

it('opens a title by remote, restores its focus after Details and can reopen the drawer', async () => {
  fetchMoviesData.mockResolvedValue(movies);
  const press = configureRemote();
  let tree;
  try {
    await act(async () => {
      tree = create(<ExploreScreen />);
    });
    await press('down');
    await press('enter');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Details', {id: '2'});
    mockScreenFocused = false;
    await act(async () => tree.update(<ExploreScreen />));
    await press('enter');
    expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    mockScreenFocused = true;
    await act(async () => tree.update(<ExploreScreen />));
    await press('enter');
    expect(mockNavigation.navigate).toHaveBeenLastCalledWith('Details', {
      id: '2',
    });
    expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
    await press('left');
    expect(mockNavigation.dispatch).toHaveBeenCalledWith({type: 'OPEN_DRAWER'});
    expect(mockToggleMenu).toHaveBeenCalledWith(true);
  } finally {
    mockScreenFocused = true;
    await act(async () => tree?.unmount());
  }
});

it('offers Retry for a failed catalog and a way back to the menu for an empty catalog', async () => {
  const press = configureRemote();
  fetchMoviesData
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce([]);
  mockToggleMenu.mockClear();
  let tree;
  try {
    await act(async () => {
      tree = create(<ExploreScreen />);
    });
    expect(tree.root.findByProps({text: 'Retry'})).toBeDefined();
    await press('enter');
    expect(
      tree.root.findByProps({children: 'No titles are available.'}),
    ).toBeDefined();
    await press('enter');
    expect(mockToggleMenu).toHaveBeenCalledWith(true);
  } finally {
    await act(async () => tree?.unmount());
  }
});
