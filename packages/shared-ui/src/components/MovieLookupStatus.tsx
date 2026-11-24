import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { DefaultFocus, SpatialNavigationNode, SpatialNavigationRoot } from 'react-tv-space-navigation';
import type { MovieLookup } from '../hooks/useMovie';
import { scaledPixels } from '../hooks/useScale';
import { safeZones, Theme } from '../theme';
import { useTheme } from './AccessibilityContext';
import FocusablePressable from './FocusablePressable';

type Props = { lookup: Exclude<MovieLookup, { status: 'found' }> };

export default function MovieLookupStatus({ lookup }: Props) {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={styles.container}>
        {lookup.status === 'loading' ? (
          <ActivityIndicator accessibilityLabel="Loading" size="large" color={theme.colors.text} />
        ) : (
          <>
            <Text accessibilityRole="alert" style={styles.message}>
              {lookup.status === 'failed' ? 'Unable to load this title.' : 'This title is not available.'}
            </Text>
            <SpatialNavigationNode orientation="vertical">
              <View style={styles.actions}>
                {lookup.status === 'failed' ? (
                  <DefaultFocus>
                    <FocusablePressable text="Retry" onSelect={lookup.retry} />
                  </DefaultFocus>
                ) : null}
                <DefaultFocus enable={lookup.status === 'missing'}>
                  <FocusablePressable text="Back" onSelect={() => navigation.goBack()} />
                </DefaultFocus>
              </View>
            </SpatialNavigationNode>
          </>
        )}
      </View>
    </SpatialNavigationRoot>
  );
}

const createStyles = ({ colors, fontSize }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: scaledPixels(24),
      backgroundColor: colors.background,
      paddingHorizontal: scaledPixels(safeZones.titleSafe.horizontal),
    },
    message: { color: colors.text, fontSize: fontSize(32) },
    actions: { gap: scaledPixels(20), alignItems: 'center' },
  });
