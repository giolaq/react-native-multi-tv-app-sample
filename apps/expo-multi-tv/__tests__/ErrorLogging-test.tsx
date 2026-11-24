import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import PlayerScreenVega from '../../../packages/shared-ui/src/screens/PlayerScreen.vega';
import AppNavigator from '../../../packages/shared-ui/src/navigation/AppNavigator';
import RemoteControlManager from '../../../packages/shared-ui/src/app/remote-control/RemoteControlManager';
import { SupportedKeys } from '../../../packages/shared-ui/src/app/remote-control/SupportedKeys';

jest.mock('react-native', () => ({
  Platform: { OS: 'android', isTV: true },
  StyleSheet: { create: (styles: object) => styles, absoluteFillObject: {} },
  View: 'View',
  BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));
jest.mock('react-tv-space-navigation', () => ({ SpatialNavigationRoot: 'SpatialNavigationRoot' }));
jest.mock('../../../packages/shared-ui/src/hooks/useMovie', () => ({
  useMovie: () => ({ status: 'found', movie: { id: 'm', movie: 'movie', headerImage: 'poster' } }),
}));
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { id: 'm' } }),
  useNavigation: () => ({ goBack: jest.fn() }),
  useIsFocused: () => true,
  NavigationContainer: 'NavigationContainer',
  DarkTheme: {},
}));
jest.mock('@react-navigation/native-stack', () => ({}), { virtual: true });
jest.mock(
  '@amazon-devices/react-native-kepler',
  () => ({
    useKeplerAppStateManager: () => ({ getComponentInstance: () => ({}) }),
  }),
  { virtual: true },
);
jest.mock('@amazon-devices/react-native-w3cmedia', () => ({}), { virtual: true });
jest.mock('../../../packages/shared-ui/src/components/player/VideoOverlay.vega', () => () => null);
jest.mock('../../../packages/shared-ui/src/components/player/VideoPlayer.vega', () => () => null);
jest.mock('../../../packages/shared-ui/src/components/player/ExitButton', () => () => null);
jest.mock('../../../packages/shared-ui/src/app/remote-control/RemoteControlManager', () => ({
  addKeydownListener: jest.fn((listener) => listener),
  removeKeydownListener: jest.fn(),
}));

const mockFailure = new Error('player rejected');
jest.mock('../../../packages/shared-ui/src/utils/VideoHandler.kepler', () => ({
  VideoHandler: jest.fn().mockImplementation((...args: Array<(value: number) => void>) => ({
    preBufferVideo: () => args[7](100),
    seek: () => {
      throw mockFailure;
    },
    isPaused: () => {
      throw mockFailure;
    },
    destroyVideoElements: jest.fn(),
  })),
}));

jest.mock('../../../packages/shared-ui/src/components/MenuContext', () => ({ MenuProvider: 'MenuProvider' }));
jest.mock('../../../packages/shared-ui/src/components/AccessibilityContext', () => ({
  AccessibilityProvider: 'AccessibilityProvider',
}));
jest.mock('../../../packages/shared-ui/src/app/remote-control/GoBackConfiguration', () => ({
  GoBackConfiguration: () => null,
}));
jest.mock('../../../packages/shared-ui/src/navigation/RootNavigator', () => () => null);
jest.mock('../../../packages/shared-ui/src/app/configureRemoteControl', () => {
  throw new Error('remote control unavailable');
});

describe('failures stay visible in a release build', () => {
  const originalDev = (global as { __DEV__?: boolean }).__DEV__;
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    (global as { __DEV__?: boolean }).__DEV__ = false;
    error.mockClear();
    warn.mockClear();
  });

  afterAll(() => {
    (global as { __DEV__?: boolean }).__DEV__ = originalDev;
    error.mockRestore();
    warn.mockRestore();
  });

  const mountPlayer = async () => {
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(<PlayerScreenVega />);
    });
    return { tree, press: jest.mocked(RemoteControlManager.addKeydownListener).mock.lastCall![0] };
  };

  it.each([
    ['seek', SupportedKeys.Right],
    ['play/pause', SupportedKeys.PlayPause],
  ])('logs a %s exception with console.error', async (_name, key) => {
    const { tree, press } = await mountPlayer();
    try {
      await act(async () => press(key));
      expect(error).toHaveBeenCalledWith(expect.stringContaining('PlayerScreen.kepler'), mockFailure);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      await act(async () => tree.unmount());
    }
  });

  it('logs a remote control configuration failure with console.error', async () => {
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(<AppNavigator />);
    });
    try {
      expect(error).toHaveBeenCalledWith(expect.stringContaining('Remote control'), expect.any(Error));
    } finally {
      await act(async () => tree.unmount());
    }
  });
});
