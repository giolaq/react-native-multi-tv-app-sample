import {useEffect, type ReactNode} from 'react';
import {StyleSheet, View, type ImageSourcePropType} from 'react-native';
import {
  createDrawerNavigator,
  type DrawerContentComponentProps,
} from '@amazon-devices/react-navigation__drawer';
import {
  useNavigation,
  DrawerActions,
} from '@amazon-devices/react-navigation__native';
import {
  CustomDrawerContent,
  useMenuContext,
  useTheme,
  scaledPixels,
  HomeScreen,
  ExploreScreen,
  TVScreen,
  SettingsScreen,
} from '@multi-tv/shared-ui';
import {DrawerParamList} from './types';

const Drawer = createDrawerNavigator<DrawerParamList>();

// shared-ui types its drawer props from @react-navigation/drawer, a separate type copy
// from the Amazon port that Metro substitutes at runtime.
const SharedDrawerContent = CustomDrawerContent as unknown as (
  props: DrawerContentComponentProps & {profileImage?: ImageSourcePropType},
) => ReactNode;

// The logo lives in this app: Vega's Metro only serves assets under the project root.
const drawerContent = (props: DrawerContentComponentProps) => (
  <SharedDrawerContent
    {...props}
    profileImage={require('../assets/kepler.png')}
  />
);

function DrawerSyncWrapper() {
  const {isOpen: isMenuOpen} = useMenuContext();
  const navigation = useNavigation();

  // Open drawer on mount if menu context says it should be open
  useEffect(() => {
    if (isMenuOpen) {
      navigation.dispatch(DrawerActions.openDrawer());
    }
  }, []);

  return null;
}

export default function VegaDrawerNavigator() {
  const styles = drawerStyles;
  const {fontScale} = useTheme();
  return (
    <View style={{flex: 1}}>
      <Drawer.Navigator
        drawerContent={drawerContent}
        initialRouteName="Home"
        defaultStatus="open"
        screenOptions={{
          headerShown: false,
          drawerActiveBackgroundColor: '#3498db',
          drawerActiveTintColor: '#ffffff',
          drawerInactiveTintColor: '#bdc3c7',
          // The labels are one line long, so the drawer grows with Larger text to keep them whole.
          drawerStyle: [
            styles.drawerStyle,
            {width: scaledPixels(DRAWER_WIDTH * fontScale)},
          ],
          drawerLabelStyle: styles.drawerLabelStyle,
          // Use 'front' type to allow drawer to open/close (collapse/expand)
          // Disable swipe gestures since we use remote control navigation
          drawerType: 'front',
          swipeEnabled: false,
        }}>
        <Drawer.Screen
          name="Home"
          component={HomeScreen}
          options={{
            drawerLabel: 'Home',
          }}
        />
        <Drawer.Screen
          name="Explore"
          component={ExploreScreen}
          options={{
            drawerLabel: 'Explore',
          }}
        />
        <Drawer.Screen
          name="TV"
          component={TVScreen}
          options={{
            drawerLabel: 'TV',
          }}
        />
        <Drawer.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            drawerLabel: 'Settings',
          }}
        />
      </Drawer.Navigator>
      <DrawerSyncWrapper />
    </View>
  );
}

const DRAWER_WIDTH = 300;

const drawerStyles = StyleSheet.create({
  drawerStyle: {
    backgroundColor: '#2c3e50',
    paddingTop: scaledPixels(0),
  },
  drawerLabelStyle: {
    fontSize: scaledPixels(18),
    fontWeight: 'bold',
    marginLeft: scaledPixels(10),
  },
});
