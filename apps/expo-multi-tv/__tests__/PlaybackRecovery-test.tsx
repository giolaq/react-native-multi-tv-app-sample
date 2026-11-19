import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import PlayerScreen from '../../../packages/shared-ui/src/screens/PlayerScreen';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { movie: 'unavailable.mp4', headerImage: 'poster' } }),
}));
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: object) => styles },
  useWindowDimensions: () => ({ width: 1920 }),
}));
jest.mock('react-native-video', () => 'NativeVideo');
jest.mock('react-tv-space-navigation', () => ({
  SpatialNavigationRoot: 'SpatialRoot',
  SpatialNavigationNode: 'SpatialNode',
  DefaultFocus: 'DefaultFocus',
}));
jest.mock('../../../packages/shared-ui/src/components/FocusablePressable', () => 'Button');
jest.mock('../../../packages/shared-ui/src/components/player/VideoOverlay', () => 'Overlay');
jest.mock('../../../packages/shared-ui/src/app/remote-control/RemoteControlManager', () => ({
  addKeydownListener: jest.fn((listener) => listener),
  removeKeydownListener: jest.fn(),
}));

it('recovers from a native video error, retries the same source and offers Back after another failure', async () => {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(<PlayerScreen />);
  });
  const nativeVideo = () => tree.root.findByProps({ resizeMode: 'cover' });
  try {
    const original = nativeVideo();
    await act(async () => {
      original.props.onBuffer({ isBuffering: true });
      original.props.onError({ error: { errorString: 'source unavailable' } });
    });
    const retry = tree.root.findByProps({ text: 'Retry' });
    expect(retry.parent?.type).toBe('DefaultFocus');
    expect(tree.root.findByProps({ isActive: true })).toBeDefined();
    expect(tree.root.findAllByProps({ resizeMode: 'cover' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ isBuffering: true })).toHaveLength(0);
    await act(async () => {
      retry.props.onSelect();
    });
    expect(nativeVideo().props.source).toEqual({ uri: 'unavailable.mp4' });
    expect(nativeVideo()).not.toBe(original);
    await act(async () => {
      nativeVideo().props.onError({});
    });
    await act(async () => {
      tree.root.findByProps({ text: 'Back' }).props.onSelect();
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => tree.unmount());
  }
});
