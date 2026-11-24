import type { CardData } from '../../../packages/shared-ui/src/data/moviesData';
import { selectHomeRows } from '../../../packages/shared-ui/src/data/homeRows';

const card = (id: string, releaseYear: number | undefined, trending: boolean): CardData => ({
  id,
  title: id,
  description: '',
  headerImage: '',
  movie: '',
  releaseYear,
  trending,
});

const summarize = (items: CardData[]) =>
  selectHomeRows(items).map((row) => ({ title: row.title, ids: row.items.map((item) => item.id) }));

it('fills each Home row by its own rule, in catalog order', () => {
  const catalog = [
    card('new-hit', 2026, true),
    card('new-quiet', 2022, false),
    card('old-hit', 2021, true),
    card('old-quiet', 2019, false),
    card('undated', undefined, false),
  ];

  expect(summarize(catalog)).toEqual([
    { title: 'Trending Movies', ids: ['new-hit', 'old-hit'] },
    { title: 'New Releases', ids: ['new-hit', 'new-quiet'] },
    { title: 'From the Archive', ids: ['old-hit', 'old-quiet'] },
  ]);
});

it('hides a row that has no items', () => {
  const catalog = [card('old-quiet', 2019, false), card('older-quiet', 2018, false)];

  expect(summarize(catalog)).toEqual([{ title: 'From the Archive', ids: ['old-quiet', 'older-quiet'] }]);
});

it('returns no rows for an empty catalog', () => {
  expect(selectHomeRows([])).toEqual([]);
});
