import { logger } from '../utils/logger';
// Catalog API types. The response is validated at runtime: see transformCatalogItem.
export type CatalogItem = {
  id: string;
  type?: string;
  title: string;
  category?: string;
  genres?: string[];
  trending?: boolean;
  rating_count?: number;
  rating_stars?: number;
  content_rating?: string;
  release_year?: number;
  duration_sec?: number;
  images: {
    poster_16x9: string;
  };
  sources: Array<{
    type: string;
    url: string;
  }>;
  description?: string;
};

export type CatalogResponse = {
  catalog_version: string;
  updated_at: string;
  items: CatalogItem[];
};

// Simplified card data for UI components
export type CardData = {
  id: string | number;
  title: string;
  description: string;
  headerImage: string;
  movie: string;
  duration?: number;
  category?: string;
  genres?: string[];
  releaseYear?: number;
  rating?: number;
  ratingCount?: number;
  contentRating?: string;
  trending?: boolean;
};

const CATALOG_URL = 'https://giolaq.github.io/scrap-tv-feed/catalog.json';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

const optionalString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const optionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const optionalBoolean = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);

const optionalStrings = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : undefined;

const itemId = (value: unknown): string | number | undefined => nonEmptyString(value) ?? optionalNumber(value);

// Prefers an mp4 source, then the first other source, ignoring sources without a URL.
const playableUrl = (sources: unknown): string | undefined => {
  if (!Array.isArray(sources)) {
    return undefined;
  }
  const playable = sources.filter(isRecord).flatMap((source) => {
    const url = nonEmptyString(source.url);
    return url ? [{ type: source.type, url }] : [];
  });
  return (playable.find((source) => source.type === 'video/mp4') ?? playable[0])?.url;
};

/**
 * Maps one catalog item to a card. Returns null and logs a warning when the item lacks an id,
 * a title, a poster image or a playable source. Optional metadata of the wrong type is dropped.
 */
export const transformCatalogItem = (item: unknown, index?: number): CardData | null => {
  const position = index === undefined ? '' : ` at index ${index}`;
  if (!isRecord(item)) {
    logger.warn(`Skipping catalog item${position}: not an object`);
    return null;
  }

  const id = itemId(item.id);
  const title = nonEmptyString(item.title);
  const headerImage = isRecord(item.images) ? nonEmptyString(item.images.poster_16x9) : undefined;
  const movie = playableUrl(item.sources);

  if (id === undefined || title === undefined || headerImage === undefined || movie === undefined) {
    const missing = [
      id === undefined && 'id',
      title === undefined && 'title',
      headerImage === undefined && 'image',
      movie === undefined && 'playable source',
    ].filter(Boolean);
    const label = id === undefined ? position : ` "${id}"${position}`;
    logger.warn(`Skipping catalog item${label}: missing ${missing.join(', ')}`);
    return null;
  }

  return {
    id,
    title,
    description: optionalString(item.description) ?? '',
    headerImage,
    movie,
    duration: optionalNumber(item.duration_sec),
    category: optionalString(item.category),
    genres: optionalStrings(item.genres),
    releaseYear: optionalNumber(item.release_year),
    rating: optionalNumber(item.rating_stars),
    ratingCount: optionalNumber(item.rating_count),
    contentRating: optionalString(item.content_rating),
    trending: optionalBoolean(item.trending),
  };
};

// Takes the parsed JSON as unknown and throws when it is not a catalog, so the catalog store
// reports a failure.
const parseCatalogResponse = (data: unknown): CardData[] => {
  if (!isRecord(data) || !Array.isArray(data.items)) {
    throw new Error('Catalog response has no items array');
  }
  return data.items.flatMap((item, index) => transformCatalogItem(item, index) ?? []);
};

// Fetch movies from catalog
export const fetchMoviesData = async (): Promise<CardData[]> => {
  try {
    const response = await fetch(CATALOG_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: CatalogResponse = await response.json();
    return parseCatalogResponse(data);
  } catch (error) {
    logger.error('Failed to fetch movies catalog:', error);
    throw error;
  }
};
