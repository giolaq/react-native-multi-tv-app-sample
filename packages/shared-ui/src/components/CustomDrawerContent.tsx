import { scaledPixels } from '../hooks/useScale';
import { DrawerContentComponentProps, DrawerContentScrollView } from '@react-navigation/drawer';
import { View, StyleSheet, Image, Text } from 'react-native';
import { DefaultFocus, SpatialNavigationFocusableView, SpatialNavigationRoot } from 'react-tv-space-navigation';
import { DrawerParamList } from '../navigation/types';
import { useMenuContext } from '../components/MenuContext';
import { safeZones, Theme } from '../theme';
import { useTheme } from '../components/AccessibilityContext';
import { useCallback, useMemo } from 'react';
import { Direction } from '@bam.tech/lrud';
import { drawerPlatform } from './drawerPlatform';

const drawerItems = [
  { name: 'Home', label: 'Home' },
  { name: 'Explore', label: 'Explore' },
] as const;

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const navigation = props.navigation;
  const { isOpen: isMenuOpen, toggleMenu } = useMenuContext();
  const theme = useTheme();
  const styles = useMemo(() => createDrawerStyles(theme), [theme]);

  const onDirectionHandledWithoutMovement = useCallback(
    (movement: Direction) => {
      if (movement === drawerPlatform.getCloseDirection()) {
        navigation.closeDrawer();
        toggleMenu(false);
      }
    },
    [navigation, toggleMenu],
  );

  const selectRoute = (route: keyof DrawerParamList) => drawerPlatform.selectRoute(navigation, route, toggleMenu);

  return (
    <SpatialNavigationRoot isActive={isMenuOpen} onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}>
      <View style={styles.drawerContainer}>
        {/* Gradient-like scrim overlay */}
        <View style={styles.scrimOverlay} />
        <DrawerContentScrollView
          {...props}
          style={styles.container}
          scrollEnabled={false}
          contentContainerStyle={drawerPlatform.contentContainerStyle}
        >
          <View style={styles.header}>
            <Image source={drawerPlatform.profileImage} style={styles.profilePic} />
            <Text style={styles.userName} numberOfLines={drawerPlatform.labelLines}>
              Pioneer Tom
            </Text>
            <Text style={styles.switchAccount} numberOfLines={drawerPlatform.labelLines}>
              Switch account
            </Text>
          </View>
          {drawerItems.map((item, index) => {
            const menuItem = (
              <SpatialNavigationFocusableView key={item.name} onSelect={() => selectRoute(item.name)}>
                {({ isFocused }) => (
                  <View style={[styles.menuItem, isFocused && styles.menuItemFocused]}>
                    <Text
                      style={[styles.menuText, isFocused && styles.menuTextFocused]}
                      numberOfLines={drawerPlatform.labelLines}
                    >
                      {item.label}
                    </Text>
                  </View>
                )}
              </SpatialNavigationFocusableView>
            );
            return index === 0 ? <DefaultFocus key={item.name}>{menuItem}</DefaultFocus> : menuItem;
          })}
        </DrawerContentScrollView>

        {/* Settings button at bottom */}
        <View style={styles.footer}>
          <SpatialNavigationFocusableView onSelect={() => selectRoute('Settings')}>
            {({ isFocused }) => (
              <View style={[styles.settingsButton, isFocused && styles.settingsButtonFocused]}>
                <View style={styles.cogIcon}>
                  <Text style={[styles.cogIconText, isFocused && styles.cogIconTextFocused]}>⚙</Text>
                </View>
              </View>
            )}
          </SpatialNavigationFocusableView>
        </View>
      </View>
    </SpatialNavigationRoot>
  );
}

const createDrawerStyles = ({ colors, fontSize, focus }: Theme) =>
  StyleSheet.create({
    drawerContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    scrimOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      opacity: 0.9,
    },
    container: {
      flex: 1,
      paddingTop: scaledPixels(safeZones.titleSafe.vertical),
    },
    header: {
      paddingHorizontal: scaledPixels(drawerPlatform.headerPaddingHorizontal),
      paddingVertical: scaledPixels(24),
      marginBottom: scaledPixels(16),
    },
    profilePic: {
      width: scaledPixels(200),
      height: scaledPixels(200),
      borderRadius: scaledPixels(24),
      borderWidth: scaledPixels(4),
      borderColor: colors.border,
      resizeMode: drawerPlatform.profileImageResizeMode,
    },
    userName: {
      color: colors.text,
      fontSize: fontSize(36),
      fontWeight: '600',
      marginTop: scaledPixels(20),
    },
    switchAccount: {
      color: colors.textSecondary,
      fontSize: fontSize(22),
      marginTop: scaledPixels(8),
    },
    searchContainer: {
      backgroundColor: colors.cardElevated,
      padding: scaledPixels(16),
      marginHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
      marginVertical: scaledPixels(12),
      borderRadius: scaledPixels(8),
    },
    searchText: {
      color: colors.textSecondary,
      fontSize: fontSize(20),
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: scaledPixels(20),
      paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
      marginHorizontal: scaledPixels(16),
      marginVertical: scaledPixels(6),
      borderRadius: scaledPixels(8),
      minHeight: scaledPixels(72),
      borderWidth: focus.borderWidth,
      borderColor: focus.restingBorderColor,
    },
    menuItemFocused: {
      backgroundColor: colors.focusBackground,
      borderColor: focus.borderColor,
      transform: [{ scale: focus.scale }],
      shadowColor: colors.focus,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.6,
      shadowRadius: scaledPixels(12),
      elevation: 8,
    },
    icon: {
      width: scaledPixels(32),
      height: scaledPixels(32),
      marginEnd: scaledPixels(20),
    },
    menuText: {
      color: colors.text,
      fontSize: fontSize(36),
      fontWeight: '500',
    },
    menuTextFocused: {
      color: colors.textOnPrimary,
      fontWeight: '600',
    },
    footer: {
      paddingHorizontal: scaledPixels(16),
      paddingBottom: scaledPixels(safeZones.actionSafe.vertical),
      paddingTop: scaledPixels(16),
      borderTopWidth: scaledPixels(2),
      borderTopColor: colors.border,
    },
    settingsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: scaledPixels(20),
      paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
      borderRadius: scaledPixels(8),
      minHeight: scaledPixels(72),
      borderWidth: focus.borderWidth,
      borderColor: focus.restingBorderColor,
    },
    settingsButtonFocused: {
      backgroundColor: colors.focusBackground,
      borderColor: focus.borderColor,
      transform: [{ scale: focus.scale }],
      shadowColor: colors.focus,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.6,
      shadowRadius: scaledPixels(12),
      elevation: 8,
    },
    cogIcon: {
      width: scaledPixels(64),
      height: scaledPixels(64),
      justifyContent: 'center',
      alignItems: 'center',
    },
    cogIconText: {
      fontSize: fontSize(48),
      color: colors.text,
    },
    cogIconTextFocused: {
      color: colors.textOnPrimary,
    },
  });
