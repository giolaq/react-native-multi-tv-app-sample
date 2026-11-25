import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import PlayerScreen from '../../../packages/shared-ui/src/screens/PlayerScreen';
import VideoPlayer from '../../../packages/shared-ui/src/components/player/VideoPlayer';
import { PlaybackPositionProvider } from '../../../packages/shared-ui/src/components/PlaybackPositionContext';
import { createPositionStore, PositionStore } from '../../../packages/shared-ui/src/data/positionStore';

let mockParams: { id: string | number; startTime?: number } = { id: 'm' };
let mockFocused = true;
const mockGoBack = jest.fn();
jest.mock('../../../packages/shared-ui/src/components/FocusablePressable', () => 'Button');
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  StyleSheet: { create: (styles: object) => styles },
  View: 'View',
  Text: 'Text',
}));
jest.mock('react-tv-space-navigation', () => ({
  SpatialNavigationRoot: 'SpatialNavigationRoot',
  SpatialNavigationNode: 'SpatialNavigationNode',
  DefaultFocus: 'DefaultFocus',
}));
jest.mock('../../../packages/shared-ui/src/hooks/useMovie', () => ({
  useMovie: () => ({ status: 'found', movie: { id: 'm', movie: 'movie', headerImage: 'poster' } }),
}));
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: mockParams }),
  useNavigation: () => ({ goBack: mockGoBack }),
  useIsFocused: () => mockFocused,
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

async function savedStore(saved: [string, number][] = []) {
  const store = createPositionStore({ read: () => JSON.stringify(saved), write: () => {} });
  await store.loaded;
  return store;
}

async function renderPlayer(store: PositionStore) {
  let tree!: TestRenderer.ReactTestRenderer;
  const element = () => (
    <PlaybackPositionProvider store={store}>
      <PlayerScreen />
    </PlaybackPositionProvider>
  );
  await act(async () => {
    tree = TestRenderer.create(element());
  });
  const video = () => tree.root.findByType(VideoPlayer);
  const leave = async () => {
    mockFocused = false;
    await act(async () => tree.update(element()));
  };
  return { tree, video, leave };
}

beforeEach(() => {
  mockParams = { id: 'm' };
  mockFocused = true;
  mockSeek.mockClear();
  mockGoBack.mockClear();
});

it('starts at the requested time once the video loads and saves where Back left it', async () => {
  mockParams = { id: 'm', startTime: 42 };
  const store = await savedStore([['m', 42]]);
  const { tree, video, leave } = await renderPlayer(store);
  try {
    expect(mockSeek).not.toHaveBeenCalled();
    await act(async () => video().props.onLoad(600));
    expect(mockSeek).toHaveBeenCalledWith(42);
    await act(async () => video().props.onProgress(130));
    await leave();
    expect(store.get('m')).toBe(130);
  } finally {
    await act(async () => tree.unmount());
  }
});

it('starts from the beginning without a start time', async () => {
  const store = await savedStore();
  const { tree, video } = await renderPlayer(store);
  try {
    await act(async () => video().props.onLoad(600));
    expect(mockSeek).not.toHaveBeenCalled();
  } finally {
    await act(async () => tree.unmount());
  }
});

it('keeps the saved position when Back is pressed before the video loads', async () => {
  mockParams = { id: 'm', startTime: 300 };
  const store = await savedStore([['m', 300]]);
  const { tree, leave } = await renderPlayer(store);
  try {
    await leave();
    expect(store.get('m')).toBe(300);
  } finally {
    await act(async () => tree.unmount());
  }
});

it('saves every 10 seconds during playback', async () => {
  jest.useFakeTimers();
  const store = await savedStore();
  const { tree, video } = await renderPlayer(store);
  try {
    await act(async () => {
      video().props.onLoad(600);
      video().props.onProgress(9);
    });
    expect(store.get('m')).toBeUndefined();
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(store.get('m')).toBe(9);
  } finally {
    await act(async () => tree.unmount());
    jest.clearAllTimers();
    jest.useRealTimers();
  }
});

it('clears the position when the title ends or Back is pressed in the last 5%', async () => {
  const store = await savedStore([['m', 100]]);
  const first = await renderPlayer(store);
  try {
    await act(async () => {
      first.video().props.onLoad(600);
      first.video().props.onProgress(560);
      first.video().props.onEnd();
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    await first.leave();
    expect(store.get('m')).toBeUndefined();
  } finally {
    await act(async () => first.tree.unmount());
  }

  mockFocused = true;
  store.save('m', 100, 600);
  const second = await renderPlayer(store);
  try {
    await act(async () => {
      second.video().props.onLoad(600);
      second.video().props.onProgress(571);
    });
    await second.leave();
    expect(store.get('m')).toBeUndefined();
  } finally {
    await act(async () => second.tree.unmount());
  }
});

it('resumes from the last position after a playback error and Retry', async () => {
  const store = await savedStore();
  const { tree, video } = await renderPlayer(store);
  try {
    await act(async () => {
      video().props.onLoad(600);
      video().props.onProgress(200);
      video().props.onError();
    });
    await act(async () => tree.root.findByProps({ text: 'Retry' }).props.onSelect());
    await act(async () => video().props.onLoad(600));
    expect(mockSeek).toHaveBeenLastCalledWith(200);
  } finally {
    await act(async () => tree.unmount());
  }
});
