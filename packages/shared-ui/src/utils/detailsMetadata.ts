import type { CardData } from '../data/moviesData';

const isPositive = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

// Hours and minutes, rounded to the nearest minute: 5592 s is "1h 33m", 2700 s is "45m".
export function formatDuration(seconds: number | undefined): string | undefined {
  if (!isPositive(seconds)) return undefined;
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function formatRating(rating: number | undefined, ratingCount: number | undefined): string | undefined {
  if (!isPositive(rating)) return undefined;
  const stars = `${rating.toFixed(1)} ⭐`;
  if (!isPositive(ratingCount)) return stars;
  return `${stars} (${ratingCount} ${ratingCount === 1 ? 'rating' : 'ratings'})`;
}

// The Details metadata row in display order. Missing, empty and zero values are left out.
export function detailsMetadata(
  movie: Pick<CardData, 'releaseYear' | 'contentRating' | 'duration' | 'rating' | 'ratingCount'>,
): string[] {
  const { releaseYear, contentRating, duration, rating, ratingCount } = movie;
  return [
    isPositive(releaseYear) ? String(releaseYear) : undefined,
    contentRating?.trim() || undefined,
    formatDuration(duration),
    formatRating(rating, ratingCount),
  ].filter((text): text is string => text !== undefined);
}
