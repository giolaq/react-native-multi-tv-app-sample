import type {MovieRouteParams} from '@multi-tv/shared-ui';

export type DrawerParamList = {
  Home: undefined;
  Explore: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Details: MovieRouteParams;
  Player: MovieRouteParams;
};
