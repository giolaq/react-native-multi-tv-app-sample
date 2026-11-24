import { Platform } from 'react-native';
import { safeZones } from '../theme';
import { getCloseDrawerDirection } from '../utils/rtl';
import { DrawerPlatform } from './drawerPlatform.types';

export const drawerPlatform: DrawerPlatform = {
  headerPaddingHorizontal: safeZones.actionSafe.horizontal,
  contentContainerStyle: {
    ...(Platform.OS === 'ios' && Platform.isTV && { paddingStart: 0, paddingEnd: 0, paddingTop: 0 }),
  },
  getCloseDirection: getCloseDrawerDirection,
  selectRoute: (navigation, route, toggleMenu) => {
    navigation.jumpTo(route);
    navigation.closeDrawer();
    toggleMenu(false);
  },
};
