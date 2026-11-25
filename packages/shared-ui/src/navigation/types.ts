import type { CardData } from '../data/moviesData';

export type MovieRouteParams = { id: CardData['id'] };
/** `startTime` is where playback begins, in seconds. Without it the title starts from the beginning. */
export type PlayerRouteParams = MovieRouteParams & { startTime?: number };

export type RootStackParamList = {
  DrawerNavigator: undefined;
  Details: MovieRouteParams;
  Player: PlayerRouteParams;
};

export type DrawerParamList = {
  Home: undefined;
  Explore: undefined;
  TV: undefined;
  Settings: undefined;
};
