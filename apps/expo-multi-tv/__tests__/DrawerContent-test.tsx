import React from 'react';
import { I18nManager, Image, StyleSheet, Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import {
  DefaultFocus,
  SpatialNavigation,
  SpatialNavigationFocusableView,
  SpatialNavigationRoot,
} from 'react-tv-space-navigation';
import { MenuProvider, useMenuContext } from '../../../packages/shared-ui/src/components/MenuContext';
import { safeZones } from '../../../packages/shared-ui/src/theme';
import CustomDrawerContent from '../../../packages/shared-ui/src/components/CustomDrawerContent';

jest.mock('../../../packages/shared-ui/src/hooks/useScale', () => ({ scaledPixels: (size: number) => size }));
jest.mock('@react-navigation/drawer', () => ({
  DrawerContentScrollView: require('react-native').View,
}));

const actualReactNative = jest.requireActual('react-native');

const navigation = { closeDrawer: jest.fn(), jumpTo: jest.fn(), navigate: jest.fn() };

function Content({ onSelect }: { onSelect: () => void }) {
  const { isOpen } = useMenuContext();
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
  const listeners = new Set<(direction: string) => void>();
  SpatialNavigation.configureRemoteControl({
    remoteControlSubscriber: (callback: (direction: string) => void) => {
      listeners.add(callback);
      return callback;
    },
    remoteControlUnsubscriber: (callback: (direction: string) => void) => listeners.delete(callback),
  } as never);
  const onSelect = jest.fn();
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(
      <MenuProvider>
        <CustomDrawerContent {...({ navigation } as unknown as React.ComponentProps<typeof CustomDrawerContent>)} />
        <Content onSelect={onSelect} />
      </MenuProvider>,
    );
  });
  const press = (direction: string) =>
    act(async () => {
      [...listeners].forEach((listener) => listener(direction));
    });
  return { tree, press, onSelect };
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('shared drawer content', () => {
  it('closes on Right, then hands Enter to the content', async () => {
    const { tree, press, onSelect } = await mountDrawer();
    try {
      await press('right');
      expect(navigation.closeDrawer).toHaveBeenCalledTimes(1);
      await press('enter');
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(navigation.jumpTo).not.toHaveBeenCalled();
    } finally {
      await act(async () => tree.unmount());
    }
  });

  it('closes on Left and ignores Right when the layout is right-to-left', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    const { tree, press } = await mountDrawer();
    try {
      await press('right');
      expect(navigation.closeDrawer).not.toHaveBeenCalled();
      await press('left');
      expect(navigation.closeDrawer).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => tree.unmount());
    }
  });

  it('jumps to Home, closes the drawer and hands focus to the content on Enter', async () => {
    const { tree, press, onSelect } = await mountDrawer();
    try {
      await press('enter');
      expect(navigation.jumpTo).toHaveBeenCalledWith('Home');
      expect(navigation.closeDrawer).toHaveBeenCalledTimes(1);
      expect(navigation.navigate).not.toHaveBeenCalled();
      await press('enter');
      expect(onSelect).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => tree.unmount());
    }
  });

  it.each([
    ['Explore', ['down']],
    ['Settings', ['down', 'down']],
  ])('routes %s with jumpTo after moving Down to it', async (route, moves) => {
    const { tree, press } = await mountDrawer();
    try {
      for (const move of moves) await press(move);
      await press('enter');
      expect(navigation.jumpTo).toHaveBeenLastCalledWith(route);
      expect(navigation.closeDrawer).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => tree.unmount());
    }
  });

  it('lets labels wrap and shows the shared logo without a resize mode', async () => {
    const { tree } = await mountDrawer();
    try {
      const labels = tree.root
        .findAllByType(Text)
        .filter((node) => ['Home', 'Explore', 'Pioneer Tom'].includes(String(node.props.children)));
      expect(labels).toHaveLength(3);
      labels.forEach((label) => expect(label.props.numberOfLines).toBeUndefined());
      const logo = tree.root.findByType(Image);
      expect(logo.props.source).toBe(require('../../../packages/shared-ui/src/assets/images/logo.png'));
      expect(logo.props.style.resizeMode).toBeUndefined();
    } finally {
      await act(async () => tree.unmount());
    }
  });

  it('insets the header by the action-safe margin and adds no content padding', async () => {
    const { tree } = await mountDrawer();
    try {
      const header = tree.root.findByType(Image).parent!;
      expect(StyleSheet.flatten(header.props.style).paddingHorizontal).toBe(safeZones.actionSafe.horizontal);
      const scroll = tree.root.findAll((node) => node.props.contentContainerStyle !== undefined)[0];
      expect(scroll.props.contentContainerStyle).toEqual({});
    } finally {
      await act(async () => tree.unmount());
    }
  });

  it.each([
    ['ios', true, { paddingStart: 0, paddingEnd: 0, paddingTop: 0 }],
    ['ios', false, {}],
    ['android', true, {}],
  ])('on %s with isTV=%s the drawer content padding is %j', (os, isTV, expected) => {
    jest.isolateModules(() => {
      jest.doMock(
        'react-native',
        () =>
          new Proxy(actualReactNative, { get: (target, key) => (key === 'Platform' ? { OS: os, isTV } : target[key]) }),
      );
      const { drawerPlatform } = require('../../../packages/shared-ui/src/components/drawerPlatform');
      expect(drawerPlatform.contentContainerStyle).toEqual(expected);
    });
  });
});
