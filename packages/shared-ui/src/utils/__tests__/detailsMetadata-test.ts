import { formatDuration, detailsMetadata } from '../detailsMetadata';

describe('formatDuration', () => {
  it.each([
    [5592, '1h 33m'],
    [5400, '1h 30m'],
    [3600, '1h'],
    [7260, '2h 1m'],
    [2700, '45m'],
    [59, '1m'],
    [3599, '1h'],
  ])('formats %i seconds as %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });

  it.each([undefined, 0, -60, Number.NaN, Number.POSITIVE_INFINITY])(
    'omits a missing or invalid duration (%p)',
    (seconds) => {
      expect(formatDuration(seconds)).toBeUndefined();
    },
  );
});

describe('detailsMetadata', () => {
  it('lists year, content rating, duration and rating in order', () => {
    expect(
      detailsMetadata({ releaseYear: 2023, contentRating: 'PG', duration: 5592, rating: 4.5, ratingCount: 120 }),
    ).toEqual(['2023', 'PG', '1h 33m', '4.5 ⭐ (120 ratings)']);
  });

  it('omits missing and zero values instead of rendering them', () => {
    expect(detailsMetadata({ releaseYear: 0, contentRating: '', duration: 0, rating: 0, ratingCount: 0 })).toEqual([]);
    expect(detailsMetadata({})).toEqual([]);
  });

  it('shows the rating without a count when the count is missing', () => {
    expect(detailsMetadata({ rating: 3, ratingCount: 0 })).toEqual(['3.0 ⭐']);
    expect(detailsMetadata({ rating: 3 })).toEqual(['3.0 ⭐']);
    expect(detailsMetadata({ rating: 3, ratingCount: 1 })).toEqual(['3.0 ⭐ (1 rating)']);
  });

  it('keeps the remaining fields when some are missing', () => {
    expect(detailsMetadata({ releaseYear: 2020, duration: 2700 })).toEqual(['2020', '45m']);
  });
});
