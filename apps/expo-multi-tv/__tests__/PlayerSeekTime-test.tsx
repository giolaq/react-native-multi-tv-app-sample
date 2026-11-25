import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import VideoPlayer from '../../../packages/shared-ui/src/components/player/VideoPlayer';
import SeekBar from '../../../packages/shared-ui/src/components/player/SeekBar';
import RemoteControlManager from '../../../packages/shared-ui/src/app/remote-control/RemoteControlManager';
import { SupportedKeys } from '../../../packages/shared-ui/src/app/remote-control/SupportedKeys';

jest.mock('../../../packages/shared-ui/src/components/FocusablePressable', () => 'Button');
jest.mock('react-tv-space-navigation', () => ({
  SpatialNavigationRoot: 'SpatialNavigationRoot',
  DefaultFocus: 'DefaultFocus',
}));
jest.mock('../../../packages/shared-ui/src/hooks/useMovie', () => ({
  useMovie: () => ({ status: 'found', movie: { id: 'm', movie: 'movie', headerImage: 'poster' } }),
}));
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { id: 'm' } }),
  useNavigation: () => ({ goBack: jest.fn() }),
  useIsFocused: () => true,
}));
jest.mock('../../../packages/shared-ui/src/app/remote-control/RemoteControlManager', () => ({
  addKeydownListener: jest.fn((listener) => listener),
  removeKeydownListener: jest.fn(),
}));
jest.mock('../../../packages/shared-ui/src/components/player/VideoPlayer', () => {
  const React = require('react');
  return React.forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({ seek: jest.fn() }));
    return null;
  });
});

// The first render loads and transforms the real overlay, Animated and Text modules. Without a warm
// transform cache (as on CI) that alone can pass the default 5 s timeout.
jest.setTimeout(30000);

// The jest-expo preset reports iOS, where the player shows native controls. Android TV draws the overlay,
// and PlayerScreen reads the platform when it loads.
let PlayerScreen: React.ComponentType;
const realOS = Platform.OS;
beforeAll(() => {
  Platform.OS = 'android';
  PlayerScreen = require('../../../packages/shared-ui/src/screens/PlayerScreen').default;
});
afterAll(() => {
  Platform.OS = realOS;
});

const shownTimes = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root
    .findAll((node) => typeof node.type === 'string' && typeof node.props.children === 'string')
    .map((node) => node.props.children as string)
    .filter((text) => / \/ /.test(text));

it('shows elapsed and total time and updates them on every seek key while the overlay is visible', async () => {
  jest.useFakeTimers();
  let tree!: TestRenderer.ReactTestRenderer;
  try {
    await act(async () => {
      tree = TestRenderer.create(<PlayerScreen />);
    });
    const video = tree.root.findByType(VideoPlayer);
    await act(async () => {
      video.props.onLoad(5590);
      video.props.onProgress(724);
    });
    expect(shownTimes(tree)).toEqual(['12:04 / 1:33:10']);

    const press = jest.mocked(RemoteControlManager.addKeydownListener).mock.lastCall![0];
    const after = async (key: SupportedKeys) => {
      await act(async () => press(key));
      return shownTimes(tree);
    };
    expect(await after(SupportedKeys.Right)).toEqual(['12:14 / 1:33:10']);
    expect(await after(SupportedKeys.FastForward)).toEqual(['12:24 / 1:33:10']);
    expect(await after(SupportedKeys.Left)).toEqual(['12:14 / 1:33:10']);
    expect(await after(SupportedKeys.Rewind)).toEqual(['12:04 / 1:33:10']);

    await act(async () => jest.advanceTimersByTime(5000));
    expect(shownTimes(tree)).toEqual([]);
    expect(await after(SupportedKeys.Right)).toEqual(['12:14 / 1:33:10']);

    await act(async () => video.props.onProgress(5585));
    expect(await after(SupportedKeys.FastForward)).toEqual(['1:33:10 / 1:33:10']);
    expect(await after(SupportedKeys.Rewind)).toEqual(['1:33:00 / 1:33:10']);
  } finally {
    await act(async () => tree?.unmount());
    jest.clearAllTimers();
    jest.useRealTimers();
  }
});

it('places the thumb from the start edge so RTL mirrors it, and keeps it on the track', async () => {
  const offsets = async (currentTime: number, duration: number) => {
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(<SeekBar currentTime={currentTime} duration={duration} />);
    });
    const styles = tree.root
      .findAll((node) => typeof node.type === 'string')
      .map((node) => StyleSheet.flatten(node.props.style) ?? {})
      .filter((style) => style.position === 'absolute');
    await act(async () => tree.unmount());
    return styles.map(({ start, left, right }) => ({ start, left, right }));
  };
  expect(await offsets(30, 120)).toEqual([{ start: '25%', left: undefined, right: undefined }]);
  expect(await offsets(130, 120)).toEqual([{ start: '100%', left: undefined, right: undefined }]);
  expect(await offsets(5, 0)).toEqual([{ start: '0%', left: undefined, right: undefined }]);
});

it('keeps the shown time inside the title and shows only elapsed time for a live stream', async () => {
  const shown = async (currentTime: number, duration: number) => {
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(<SeekBar currentTime={currentTime} duration={duration} />);
    });
    const texts = tree.root
      .findAll((node) => typeof node.type === 'string' && typeof node.props.children === 'string')
      .map((node) => node.props.children as string);
    await act(async () => tree.unmount());
    return texts;
  };
  expect(await shown(-2, 90)).toEqual(['0:00 / 1:30']);
  expect(await shown(95, 90)).toEqual(['1:30 / 1:30']);
  expect(await shown(75, Infinity)).toEqual(['1:15']);
});
