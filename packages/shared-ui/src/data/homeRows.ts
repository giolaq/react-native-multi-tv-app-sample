import type { CardData } from './moviesData';

type HomeRowDefinition = {
  key: string;
  title: string;
  select: (items: CardData[]) => CardData[];
};

type HomeRow = {
  key: string;
  title: string;
  items: CardData[];
};

const FIRST_NEW_RELEASE_YEAR = 2022;

const homeRowDefinitions: readonly HomeRowDefinition[] = [
  {
    key: 'trending',
    title: 'Trending Movies',
    select: (items) => items.filter((item) => item.trending === true),
  },
  {
    key: 'new-releases',
    title: 'New Releases',
    select: (items) =>
      items.filter((item) => item.releaseYear !== undefined && item.releaseYear >= FIRST_NEW_RELEASE_YEAR),
  },
  {
    key: 'archive',
    title: 'From the Archive',
    select: (items) =>
      items.filter((item) => item.releaseYear !== undefined && item.releaseYear < FIRST_NEW_RELEASE_YEAR),
  },
];

export function selectHomeRows(items: CardData[]): HomeRow[] {
  return homeRowDefinitions
    .map(({ key, title, select }) => ({ key, title, items: select(items) }))
    .filter((row) => row.items.length > 0);
}
