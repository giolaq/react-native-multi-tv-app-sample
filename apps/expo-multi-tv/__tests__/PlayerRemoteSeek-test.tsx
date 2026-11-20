import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import PlayerScreen from '../../../packages/shared-ui/src/screens/PlayerScreen';
import VideoPlayer from '../../../packages/shared-ui/src/components/player/VideoPlayer';
import RemoteControlManager from '../../../packages/shared-ui/src/app/remote-control/RemoteControlManager';
import { SupportedKeys } from '../../../packages/shared-ui/src/app/remote-control/SupportedKeys';

jest.mock('../../../packages/shared-ui/src/components/FocusablePressable', () => 'Button');
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  StyleSheet: { create: (styles: object) => styles },
  View: 'View',
}));
jest.mock('react-tv-space-navigation', () => ({ SpatialNavigationRoot: 'SpatialNavigationRoot' }));
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { movie: 'movie', headerImage: 'poster' } }),
  useNavigation: () => ({}),
  useIsFocused: () => true,
}));
jest.mock('../../../packages/shared-ui/src/components/player/VideoOverlay', () => () => null);
jest.mock('../../../packages/shared-ui/src/app/remote-control/RemoteControlManager', () => ({
  addKeydownListener: jest.fn((listener) => listener),
  removeKeydownListener: jest.fn(),
}));

const mockSeek = jest.fn();
jest.mock('../../../packages/shared-ui/src/components/player/VideoPlayer', () => {
  const React = require('react');
  return React.forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({ seek: mockSeek }));
    return null;
  });
});

it('seeks from playback progress, accumulates rapid presses and clamps at both ends', async () => {
  jest.useFakeTimers();
  let tree!: TestRenderer.ReactTestRenderer;
  try {
    await act(async () => {
      tree = TestRenderer.create(<PlayerScreen />);
    });
    const video = tree.root.findByType(VideoPlayer);
    await act(async () => {
      video.props.onLoad(85);
      video.props.onProgress(60);
    });
    const press = jest.mocked(RemoteControlManager.addKeydownListener).mock.lastCall![0];
    await act(async () => {
      press(SupportedKeys.FastForward);
      press(SupportedKeys.Rewind);
      press(SupportedKeys.Right);
      press(SupportedKeys.Right);
      press(SupportedKeys.FastForward);
      video.props.onProgress(4);
      press(SupportedKeys.Left);
    });
    expect(mockSeek.mock.calls.flat()).toEqual([70, 60, 70, 80, 85, 0]);
  } finally {
    await act(async () => tree?.unmount());
    jest.clearAllTimers();
    jest.useRealTimers();
  }
});
