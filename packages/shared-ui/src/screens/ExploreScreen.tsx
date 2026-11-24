import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { DrawerActions, useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  DefaultFocus,
  SpatialNavigationFocusableView,
  SpatialNavigationRoot,
  SpatialNavigationScrollView,
} from 'react-tv-space-navigation';
import { useTheme } from '../components/AccessibilityContext';
import FocusablePressable from '../components/FocusablePressable';
import { useMenuContext } from '../components/MenuContext';
import { useCatalog } from '../hooks/useCatalog';
import { scaledPixels } from '../hooks/useScale';
import type { RootStackParamList } from '../navigation/types';
import { safeZones, Theme } from '../theme';
import { getOpenDrawerDirection } from '../utils/rtl';

export default function ExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const { isOpen, toggleMenu } = useMenuContext();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const catalog = useCatalog();
  const movies = catalog.status === 'loaded' ? catalog.items : null;
  const failed = catalog.status === 'failed';

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
    toggleMenu(true);
  };

  return (
    <SpatialNavigationRoot
      isActive={isFocused && !isOpen}
      onDirectionHandledWithoutMovement={(direction) => {
        if (direction === getOpenDrawerDirection()) openDrawer();
      }}
    >
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.heading}>
          Explore
        </Text>
        {movies?.length ? (
          <SpatialNavigationScrollView style={styles.list} contentContainerStyle={styles.rows}>
            {movies.map((item, index) => {
              const openDetails = () => navigation.navigate('Details', item);
              return (
                <DefaultFocus key={item.id} enable={index === 0}>
                  <SpatialNavigationFocusableView onSelect={openDetails}>
                    {({ isFocused: selected }) => (
                      <Pressable
                        accessibilityLabel={item.title}
                        accessibilityRole="button"
                        onPress={openDetails}
                        style={[styles.row, selected && styles.selectedRow]}
                      >
                        {item.headerImage ? <Image source={{ uri: item.headerImage }} style={styles.poster} /> : null}
                        <Text style={[styles.title, selected && styles.selectedTitle]}>{item.title}</Text>
                      </Pressable>
                    )}
                  </SpatialNavigationFocusableView>
                </DefaultFocus>
              );
            })}
          </SpatialNavigationScrollView>
        ) : (
          <View style={styles.rows}>
            <Text accessibilityLiveRegion="polite" style={styles.status}>
              {failed ? 'Unable to load the catalog.' : movies ? 'No titles are available.' : 'Loading catalog…'}
            </Text>
            <DefaultFocus>
              {failed ? (
                <FocusablePressable text="Retry" onSelect={catalog.retry} />
              ) : (
                <FocusablePressable text="Open menu" onSelect={openDrawer} />
              )}
            </DefaultFocus>
          </View>
        )}
      </View>
    </SpatialNavigationRoot>
  );
}

const createStyles = ({ colors, fontSize, focus }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: scaledPixels(safeZones.titleSafe.horizontal),
      paddingVertical: scaledPixels(safeZones.titleSafe.vertical),
    },
    heading: { color: colors.text, fontSize: fontSize(44), fontWeight: 'bold', marginBottom: scaledPixels(20) },
    list: { flex: 1 },
    rows: { gap: scaledPixels(12) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaledPixels(24),
      padding: scaledPixels(12),
      backgroundColor: colors.card,
      borderRadius: scaledPixels(8),
      borderWidth: focus.borderWidth,
      borderColor: focus.restingBorderColor,
    },
    selectedRow: { borderColor: focus.borderColor, backgroundColor: colors.focusBackground },
    poster: { width: scaledPixels(160), height: scaledPixels(90) },
    title: { flex: 1, color: colors.text, fontSize: fontSize(30) },
    selectedTitle: { color: colors.textOnPrimary },
    status: { color: colors.text, fontSize: fontSize(28) },
  });
