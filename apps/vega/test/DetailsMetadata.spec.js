let React;
let act;
let create;
let SpatialNavigation;
let fetchMoviesData;

const mockNavigation = {navigate: jest.fn(), goBack: jest.fn()};
const mockRouteParams = {id: 'movie'};

jest.mock(
  '@react-navigation/native',
  () => ({
    useNavigation: () => mockNavigation,
    useRoute: () => ({params: mockRouteParams}),
    useIsFocused: () => true,
  }),
  {virtual: true},
);
jest.mock('../../../packages/shared-ui/src/data/moviesData', () => ({
  fetchMoviesData: jest.fn(),
}));

const film = (fields) => ({
  id: 'movie',
  title: 'Movie',
  description: 'Movie synopsis',
  headerImage: 'movie.jpg',
  movie: 'movie.mp4',
  ...fields,
});

beforeEach(() => {
  jest.resetModules();
  React = require('react');
  ({act, create} = require('react-test-renderer'));
  ({SpatialNavigation} = require('react-tv-space-navigation'));
  ({
    fetchMoviesData,
  } = require('../../../packages/shared-ui/src/data/moviesData'));
  mockNavigation.navigate.mockClear();
});

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

async function renderDetails(movie) {
  fetchMoviesData.mockResolvedValue([movie]);
  const press = configureRemote();
  const Details =
    require('../../../packages/shared-ui/src/screens/DetailsScreen').default;
  let tree;
  await act(async () => {
    tree = create(<Details />);
  });
  return {tree, press};
}

// Every string rendered by a host Text node, in order.
const texts = (tree) =>
  tree.root
    .findAll((node) => node.type === 'Text')
    .flatMap((node) => [node.props.children].flat())
    .filter((child) => typeof child === 'string' || typeof child === 'number')
    .map(String);

// Strings or numbers rendered directly by a host node other than Text, which React Native rejects.
function strayText(node, parent) {
  if (typeof node === 'string' || typeof node === 'number') {
    return parent === 'Text' ? [] : [node];
  }
  if (!node) {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap((child) => strayText(child, parent));
  }
  return (node.children || []).flatMap((child) => strayText(child, node.type));
}

it('shows the duration in hours and minutes and no hardcoded crew', async () => {
  const {tree} = await renderDetails(
    film({
      releaseYear: 2023,
      contentRating: 'PG',
      duration: 5592,
      rating: 4.5,
      ratingCount: 120,
    }),
  );
  try {
    const shown = texts(tree);
    expect(shown).toEqual(
      expect.arrayContaining([
        'Movie',
        '2023',
        'PG',
        '1h 33m',
        '4.5 ⭐ (120 ratings)',
      ]),
    );
    expect(shown).not.toContain('93m 12s');
    for (const crew of [
      'Director',
      'Executive Producer',
      'Star',
      'Chris Traganos',
      'Gio Laquidara',
      'Eric Fahsl',
    ]) {
      expect(shown).not.toContain(crew);
    }
  } finally {
    await act(async () => tree.unmount());
  }
});

it('omits missing and zero metadata without rendering stray text', async () => {
  const {tree} = await renderDetails(
    film({
      releaseYear: 0,
      contentRating: '',
      duration: 0,
      rating: 0,
      ratingCount: 0,
    }),
  );
  try {
    expect(strayText(tree.toJSON())).toEqual([]);
    expect(texts(tree)).toEqual(['Movie', 'Movie synopsis', 'Watch now']);
  } finally {
    await act(async () => tree.unmount());
  }
});

it('focuses Watch now by default so Select opens the player', async () => {
  const {tree, press} = await renderDetails(film({duration: 2700}));
  try {
    await press('enter');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Player', {
      id: 'movie',
    });
  } finally {
    await act(async () => tree.unmount());
  }
});
