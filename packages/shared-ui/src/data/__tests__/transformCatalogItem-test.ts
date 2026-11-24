import { transformCatalogItem, type CatalogItem } from '../moviesData';

const catalogItem = (sources: CatalogItem['sources']): CatalogItem => ({
  id: 'abc',
  type: 'movie',
  title: 'A Title',
  category: 'Drama',
  genres: ['Drama', 'Mystery'],
  trending: true,
  rating_count: 120,
  rating_stars: 4.5,
  content_rating: 'PG',
  release_year: 2023,
  duration_sec: 5400,
  images: { poster_16x9: 'https://img.example/poster.jpg' },
  sources,
  description: 'A description',
});

it('maps catalog fields to card fields', () => {
  expect(transformCatalogItem(catalogItem([{ type: 'video/mp4', url: 'https://v.example/a.mp4' }]))).toEqual({
    id: 'abc',
    title: 'A Title',
    description: 'A description',
    headerImage: 'https://img.example/poster.jpg',
    movie: 'https://v.example/a.mp4',
    duration: 5400,
    category: 'Drama',
    genres: ['Drama', 'Mystery'],
    releaseYear: 2023,
    rating: 4.5,
    ratingCount: 120,
    contentRating: 'PG',
    trending: true,
  });
});

it('prefers the mp4 source over earlier sources of other types', () => {
  const card = transformCatalogItem(
    catalogItem([
      { type: 'application/x-mpegURL', url: 'https://v.example/a.m3u8' },
      { type: 'video/mp4', url: 'https://v.example/a.mp4' },
    ]),
  );

  expect(card.movie).toBe('https://v.example/a.mp4');
});

it('falls back to the first source when none is mp4', () => {
  const card = transformCatalogItem(
    catalogItem([
      { type: 'application/x-mpegURL', url: 'https://v.example/a.m3u8' },
      { type: 'application/dash+xml', url: 'https://v.example/a.mpd' },
    ]),
  );

  expect(card.movie).toBe('https://v.example/a.m3u8');
});

it('gives an empty movie URL when the item has no sources', () => {
  expect(transformCatalogItem(catalogItem([])).movie).toBe('');
});
