import type { CardData } from '../data/moviesData';

export type MovieRouteParams = { id: CardData['id'] };

export type RootStackParamList = {
  DrawerNavigator: undefined;
  Details: MovieRouteParams;
  Player: MovieRouteParams;
};

export type DrawerParamList = {
  Home: undefined;
  Explore: undefined;
  TV: undefined;
  Settings: undefined;
};
