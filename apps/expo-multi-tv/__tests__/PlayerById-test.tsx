import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import PlayerScreen from '../../../packages/shared-ui/src/screens/PlayerScreen';
import VideoPlayer from '../../../packages/shared-ui/src/components/player/VideoPlayer';
import { fetchMoviesData } from '../../../packages/shared-ui/src/data/moviesData';

jest.mock('../../../packages/shared-ui/src/data/moviesData', () => ({ fetchMoviesData: jest.fn() }));
jest.mock('../../../packages/shared-ui/src/components/FocusablePressable', () => 'Button');
jest.mock('react-tv-space-navigation', () => ({
  SpatialNavigationRoot: 'SpatialNavigationRoot',
  SpatialNavigationNode: 'SpatialNavigationNode',
  DefaultFocus: 'DefaultFocus',
}));
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { id: '7' } }),
  useNavigation: () => ({ goBack: jest.fn() }),
  useIsFocused: () => true,
}));
jest.mock('../../../packages/shared-ui/src/components/player/VideoOverlay', () => () => null);
jest.mock('../../../packages/shared-ui/src/app/remote-control/RemoteControlManager', () => ({
  addKeydownListener: jest.fn((listener) => listener),
  removeKeydownListener: jest.fn(),
}));
jest.mock('../../../packages/shared-ui/src/components/player/VideoPlayer', () =>
  require('react').forwardRef(() => null),
);

const film = (id: string | number, title: string) => ({
  id,
  title,
  description: '',
  headerImage: `${title}.jpg`,
  movie: `${title}.mp4`,
});

it('plays the stream URL of the movie whose id the player receives', async () => {
  jest.mocked(fetchMoviesData).mockResolvedValue([film('first', 'First'), film(7, 'Seventh')]);
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(<PlayerScreen />);
  });
  try {
    const video = tree.root.findByType(VideoPlayer);
    expect(video.props).toMatchObject({ movie: 'Seventh.mp4', headerImage: 'Seventh.jpg' });
  } finally {
    await act(async () => tree.unmount());
  }
});
