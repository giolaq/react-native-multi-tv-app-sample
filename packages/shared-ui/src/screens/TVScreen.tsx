// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useNavigation } from '@react-navigation/native';
import { StyleSheet, View, Text } from 'react-native';
import { DefaultFocus, SpatialNavigationFocusableView, SpatialNavigationRoot } from 'react-tv-space-navigation';
import { scaledPixels } from '../hooks/useScale';
import { useTheme } from '../components/AccessibilityContext';
import { useMenuContext } from '../components/MenuContext';
import { DrawerActions, useIsFocused } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Direction } from '@bam.tech/lrud';
import { safeZones, Theme } from '../theme';
import { getOpenDrawerDirection } from '../utils/rtl';

export default function TVScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isOpen: isMenuOpen, toggleMenu } = useMenuContext();
  const isFocused = useIsFocused();
  const isActive = isFocused && !isMenuOpen;
  const navigation = useNavigation();
  const [focusedIndex, setFocusedIndex] = useState(0);

  const onDirectionHandledWithoutMovement = useCallback(
    (movement: Direction) => {
      if (movement === getOpenDrawerDirection() && focusedIndex === 0) {
        navigation.dispatch(DrawerActions.openDrawer());
        toggleMenu(true);
      }
    },
    [toggleMenu, focusedIndex, navigation],
  );

  return (
    <SpatialNavigationRoot isActive={isActive} onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}>
      <View style={styles.container}>
        <DefaultFocus>
          <SpatialNavigationFocusableView>
            {({ isFocused: titleFocused }) => (
              <View style={[styles.titleRing, titleFocused && styles.titleRingFocused]}>
                <Text style={styles.title}>TV Screen</Text>
              </View>
            )}
          </SpatialNavigationFocusableView>
        </DefaultFocus>
      </View>
    </SpatialNavigationRoot>
  );
}

const createStyles = ({ colors, fontSize, focus }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: scaledPixels(safeZones.titleSafe.horizontal),
      paddingVertical: scaledPixels(safeZones.titleSafe.vertical),
    },
    titleRing: {
      paddingHorizontal: scaledPixels(24),
      marginBottom: scaledPixels(20),
      borderRadius: scaledPixels(8),
      borderWidth: focus.borderWidth,
      borderColor: focus.restingBorderColor,
    },
    titleRingFocused: { borderColor: focus.borderColor },
    title: {
      fontSize: fontSize(32),
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginVertical: scaledPixels(10),
    },
  });
