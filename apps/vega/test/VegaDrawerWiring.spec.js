/* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0 */
import React from 'react';
import {Image} from 'react-native';
import {act, create} from 'react-test-renderer';
import {MenuProvider} from '../../../packages/shared-ui/src/components/MenuContext';
import {drawerContent} from '../src/navigation/VegaDrawerNavigator';

const KEPLER_LOGO = require('../src/assets/kepler.png');
const SHARED_DEFAULT_LOGO = require('../../../packages/shared-ui/src/assets/images/logo.png');

const mockNavigation = {
  closeDrawer: jest.fn(),
  jumpTo: jest.fn(),
  navigate: jest.fn(),
};
jest.mock('@amazon-devices/react-navigation__native', () => ({
  useNavigation: () => mockNavigation,
  DrawerActions: {},
}));
jest.mock('@amazon-devices/react-navigation__drawer', () => ({
  DrawerContentScrollView: require('react-native').View,
  createDrawerNavigator: () => ({Navigator: () => null, Screen: () => null}),
}));
jest.mock('../../../packages/shared-ui/src/hooks/useScale', () => ({
  scaledPixels: (value) => value,
}));
jest.mock(
  '@multi-tv/shared-ui',
  () => ({
    CustomDrawerContent:
      require('../../../packages/shared-ui/src/components/CustomDrawerContent')
        .default,
    useMenuContext:
      require('../../../packages/shared-ui/src/components/MenuContext')
        .useMenuContext,
    useTheme: () => ({fontScale: 1}),
    scaledPixels: (value) => value,
    HomeScreen: () => null,
    ExploreScreen: () => null,
    SettingsScreen: () => null,
  }),
  {virtual: true},
);

describe('Vega drawer wiring', () => {
  it('renders the drawer with the Vega-bundled logo, not the shared default', async () => {
    expect(SHARED_DEFAULT_LOGO).not.toBe(KEPLER_LOGO);
    let tree;
    await act(async () => {
      tree = create(
        <MenuProvider>
          {drawerContent({navigation: mockNavigation})}
        </MenuProvider>,
      );
    });
    try {
      expect(tree.root.findByType(Image).props.source).toBe(KEPLER_LOGO);
    } finally {
      await act(async () => tree.unmount());
    }
  });
});
