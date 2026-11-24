import { DrawerPlatform } from './drawerPlatform.types';

// The Vega navigator never mirrors the drawer in RTL, so the drawer always closes on Right.
export const drawerPlatform: DrawerPlatform = {
  profileImageResizeMode: 'contain',
  labelLines: 1,
  headerPaddingHorizontal: 24,
  // Drawer v8 adds its own start/end padding on every platform, which wrapped labels mid-word.
  contentContainerStyle: { paddingStart: 0, paddingEnd: 0 },
  getCloseDirection: () => 'right',
  selectRoute: (navigation, route, toggleMenu) => {
    toggleMenu(false);
    navigation.navigate(route);
  },
};
