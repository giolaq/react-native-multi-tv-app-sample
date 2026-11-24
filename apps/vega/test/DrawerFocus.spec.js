/* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0 */
import React from 'react';
import {I18nManager, Image, Text} from 'react-native';
import {act, create} from 'react-test-renderer';
import {
  SpatialNavigation,
  SpatialNavigationRoot,
  SpatialNavigationFocusableView,
  DefaultFocus,
} from 'react-tv-space-navigation';
import {
  MenuProvider,
  useMenuContext,
} from '../../../packages/shared-ui/src/components/MenuContext';
import CustomDrawerContent from '../../../packages/shared-ui/src/components/CustomDrawerContent';

const LOGO = require('../../../packages/shared-ui/src/assets/images/kepler.png');

const mockNavigation = {
  closeDrawer: jest.fn(),
  jumpTo: jest.fn(),
  navigate: jest.fn(),
};
jest.mock('@amazon-devices/react-navigation__native', () => ({
  useNavigation: () => mockNavigation,
}));
jest.mock('@amazon-devices/react-navigation__drawer', () => ({
  DrawerContentScrollView: require('react-native').View,
}));
jest.mock('../../../packages/shared-ui/src/hooks/useScale', () => ({
  scaledPixels: (value) => value,
}));

function Content({onSelect}) {
  const {isOpen} = useMenuContext();
  return (
    <SpatialNavigationRoot isActive={!isOpen}>
      <DefaultFocus>
        <SpatialNavigationFocusableView onSelect={onSelect}>
          {() => <Text>Content item</Text>}
        </SpatialNavigationFocusableView>
      </DefaultFocus>
    </SpatialNavigationRoot>
  );
}

async function mountDrawer() {
  const listeners = new Set();
  SpatialNavigation.configureRemoteControl({
    remoteControlSubscriber: (callback) => {
      listeners.add(callback);
      return callback;
    },
    remoteControlUnsubscriber: (callback) => listeners.delete(callback),
  });
  const onSelect = jest.fn();
  let tree;
  await act(async () => {
    tree = create(
      <MenuProvider>
        <CustomDrawerContent navigation={mockNavigation} />
        <Content onSelect={onSelect} />
      </MenuProvider>,
    );
  });
  const press = async (direction) => {
    await act(async () => {
      [...listeners].forEach((listener) => listener(direction));
    });
  };
  return {tree, press, onSelect};
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('shared drawer on Vega', () => {
  it('closes the focused drawer on Right and routes Enter to the content', async () => {
    const {tree, press, onSelect} = await mountDrawer();
    try {
      await press('right');
      expect(mockNavigation.closeDrawer).toHaveBeenCalledTimes(1);
      await press('enter');
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    } finally {
      await act(async () => tree.unmount());
    }
  });

  it('still closes on Right and ignores Left when the layout is right-to-left', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    const {tree, press} = await mountDrawer();
    try {
      await press('left');
      expect(mockNavigation.closeDrawer).not.toHaveBeenCalled();
      await press('right');
      expect(mockNavigation.closeDrawer).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => tree.unmount());
    }
  });

  it('navigates to Home on Enter without calling jumpTo or closeDrawer, then hands focus to the content', async () => {
    const {tree, press, onSelect} = await mountDrawer();
    try {
      await press('enter');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Home');
      expect(mockNavigation.jumpTo).not.toHaveBeenCalled();
      expect(mockNavigation.closeDrawer).not.toHaveBeenCalled();
      await press('enter');
      expect(onSelect).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => tree.unmount());
    }
  });

  it.each([
    ['Explore', ['down']],
    ['Settings', ['down', 'down']],
  ])('navigates to %s after moving Down to it', async (route, moves) => {
    const {tree, press} = await mountDrawer();
    try {
      for (const move of moves) await press(move);
      await press('enter');
      expect(mockNavigation.navigate).toHaveBeenLastCalledWith(route);
      expect(mockNavigation.jumpTo).not.toHaveBeenCalled();
      expect(mockNavigation.closeDrawer).not.toHaveBeenCalled();
    } finally {
      await act(async () => tree.unmount());
    }
  });

  it('keeps labels on one line and shows the Vega logo contained', async () => {
    const {tree} = await mountDrawer();
    try {
      const labels = tree.root
        .findAllByType(Text)
        .filter((node) =>
          ['Home', 'Explore', 'Pioneer Tom', 'Switch account'].includes(
            String(node.props.children),
          ),
        );
      expect(labels).toHaveLength(4);
      labels.forEach((label) => expect(label.props.numberOfLines).toBe(1));
      const logo = tree.root.findByType(Image);
      expect(logo.props.source).toBe(LOGO);
      expect(logo.props.style.resizeMode).toBe('contain');
    } finally {
      await act(async () => tree.unmount());
    }
  });

  it('drops the drawer scroll view start and end padding and keeps the 24 unit header inset', async () => {
    const {tree} = await mountDrawer();
    try {
      const scroll = tree.root.findAll(
        (node) => node.props.scrollEnabled === false,
      )[0];
      expect(scroll.props.contentContainerStyle).toEqual({
        paddingStart: 0,
        paddingEnd: 0,
      });
      const header = tree.root.findByType(Image).parent;
      expect(header.props.style.paddingHorizontal).toBe(24);
    } finally {
      await act(async () => tree.unmount());
    }
  });
});
