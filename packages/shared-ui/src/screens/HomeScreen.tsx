import { StyleSheet, View, Image, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { DrawerActions, useIsFocused } from '@react-navigation/native';
import { useTheme } from '../components/AccessibilityContext';
import { useMenuContext } from '../components/MenuContext';
import {
  SpatialNavigationFocusableView,
  SpatialNavigationRoot,
  SpatialNavigationScrollView,
  SpatialNavigationNode,
  SpatialNavigationVirtualizedList,
  DefaultFocus,
} from 'react-tv-space-navigation';
import { Direction } from '@bam.tech/lrud';
import { scaledPixels } from '../hooks/useScale';
import { RootStackParamList } from '../navigation/types';
import { CardData } from '../data/moviesData';
import { selectHomeRows } from '../data/homeRows';
import { Catalog, useCatalog } from '../hooks/useCatalog';
import FocusablePressable from '../components/FocusablePressable';
import { safeZones, Theme } from '../theme';
import PlatformLinearGradient from '../components/PlatformLinearGradient';
import { getOpenDrawerDirection } from '../utils/rtl';
import { logger } from '../utils/logger';

const standardScrim = ['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'transparent'];
const highContrastScrim = ['rgba(0,0,0,0.97)', 'rgba(0,0,0,0.9)', 'rgba(0,0,0,0.6)', 'transparent'];

type HomeStyles = ReturnType<typeof createStyles>;
type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DrawerNavigator'>;

// Memoized MovieItem component to prevent unnecessary re-renders and optimize image source
const MovieItem = React.memo(
  ({ item, isFocused, styles }: { item: CardData; isFocused: boolean; styles: HomeStyles }) => {
    const imageSource = useMemo(() => ({ uri: item.headerImage }), [item.headerImage]);

    return (
      <View style={[styles.highlightThumbnail, isFocused && styles.highlightThumbnailFocused]}>
        <Image
          source={imageSource}
          style={styles.cardImage}
          resizeMode="cover"
          onError={(error) => logger.debug('Image load error:', item.title, error.nativeEvent.error)}
        />
      </View>
    );
  },
);

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isOpen: isMenuOpen, toggleMenu } = useMenuContext();
  const [focusedCard, setFocusedCard] = useState<{ item: CardData; indexInRow: number } | null>(null);
  const catalog = useCatalog();
  const rows = useMemo(() => (catalog.status === 'loaded' ? selectHomeRows(catalog.items) : []), [catalog]);
  const isFocused = useIsFocused();
  const isActive = isFocused && !isMenuOpen;

  const focusedItem = focusedCard?.item ?? rows[0]?.items[0] ?? null;

  // Memoize header image source to prevent unnecessary re-renders
  const headerImageSource = useMemo(
    () => (focusedItem ? { uri: focusedItem.headerImage } : undefined),
    [focusedItem?.headerImage],
  );

  const renderHeader = useCallback(() => {
    if (!focusedItem) return null;

    return (
      <View style={styles.header}>
        <Image style={styles.headerImage} source={headerImageSource} resizeMode="cover" />
        {/* Linear gradient scrim for left overlay */}
        <PlatformLinearGradient
          colors={theme.preferences.highContrast ? highContrastScrim : standardScrim}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientLeft}
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{focusedItem.title}</Text>
          <Text style={styles.headerDescription} numberOfLines={3}>
            {focusedItem.description}
          </Text>
        </View>
      </View>
    );
  }, [headerImageSource, focusedItem, styles, theme.preferences.highContrast]);

  const onDirectionHandledWithoutMovement = useCallback(
    (movement: Direction) => {
      if (movement === getOpenDrawerDirection() && (focusedCard?.indexInRow ?? 0) === 0) {
        navigation.dispatch(DrawerActions.openDrawer());
        toggleMenu(true);
      }
    },
    [toggleMenu, focusedCard, navigation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CardData; index: number }) => (
      <SpatialNavigationFocusableView
        onSelect={() => {
          navigation.navigate('Details', {
            title: item.title,
            description: item.description,
            headerImage: item.headerImage,
            movie: item.movie,
            category: item.category,
            genres: item.genres,
            releaseYear: item.releaseYear,
            rating: item.rating,
            ratingCount: item.ratingCount,
            contentRating: item.contentRating,
            duration: item.duration,
          });
        }}
        onFocus={() => setFocusedCard({ item, indexInRow: index })}
      >
        {({ isFocused }) => <MovieItem item={item} isFocused={isFocused} styles={styles} />}
      </SpatialNavigationFocusableView>
    ),
    [navigation, styles],
  );

  return (
    <SpatialNavigationRoot isActive={isActive} onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}>
      <View style={styles.container}>
        {rows.length === 0 ? (
          <CatalogStatus catalog={catalog} styles={styles} />
        ) : (
          <>
            {renderHeader()}
            <SpatialNavigationScrollView offsetFromStart={scaledPixels(60)} style={styles.scrollContent}>
              {rows.map((row) => (
                <View key={row.key} style={styles.highlightsContainer}>
                  <Text style={styles.highlightsTitle}>{row.title}</Text>
                  <SpatialNavigationNode>
                    <DefaultFocus>
                      <SpatialNavigationVirtualizedList
                        data={row.items}
                        orientation="horizontal"
                        renderItem={renderItem}
                        itemSize={scaledPixels(440)}
                        onEndReachedThresholdItemsNumber={3}
                      />
                    </DefaultFocus>
                  </SpatialNavigationNode>
                </View>
              ))}
            </SpatialNavigationScrollView>
          </>
        )}
      </View>
    </SpatialNavigationRoot>
  );
}

const statusMessages: Record<Catalog['status'], string> = {
  loading: 'Loading movies...',
  failed: 'Unable to load movies.',
  loaded: 'No movies are available.',
};

function CatalogStatus({ catalog, styles }: { catalog: Catalog; styles: HomeStyles }) {
  return (
    <View style={styles.status}>
      <Text accessibilityLiveRegion="polite" style={styles.statusText}>
        {statusMessages[catalog.status]}
      </Text>
      {catalog.status === 'failed' ? (
        <DefaultFocus>
          <FocusablePressable text="Retry" onSelect={catalog.retry} />
        </DefaultFocus>
      ) : null}
    </View>
  );
}

const createStyles = ({ colors, fontSize, focus }: Theme) => {
  // The ring is never thinner than the 6px focused border the cards always had.
  const ringWidth = Math.max(focus.borderWidth, scaledPixels(6));
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    status: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: scaledPixels(24),
    },
    statusText: {
      color: colors.text,
      fontSize: fontSize(24),
    },
    scrollContent: {
      flex: 1,
      marginBottom: scaledPixels(safeZones.actionSafe.vertical),
    },
    highlightsTitle: {
      color: colors.text,
      fontSize: fontSize(40),
      fontWeight: 'bold',
      marginBottom: scaledPixels(16),
      marginTop: scaledPixels(20),
      textShadowColor: 'rgba(0, 0, 0, 0.9)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
    },
    headerTitle: {
      color: colors.text,
      fontSize: fontSize(56),
      fontWeight: 'bold',
      marginBottom: scaledPixels(16),
      textShadowColor: 'rgba(0, 0, 0, 0.9)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 12,
    },
    headerDescription: {
      color: colors.text,
      fontSize: fontSize(28),
      fontWeight: '500',
      lineHeight: fontSize(40),
      textShadowColor: 'rgba(0, 0, 0, 0.9)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
    },
    highlightThumbnail: {
      width: scaledPixels(420),
      height: scaledPixels(260),
      marginEnd: scaledPixels(20),
      backgroundColor: colors.card,
      borderRadius: scaledPixels(12),
      borderWidth: ringWidth,
      borderColor: focus.restingBorderColor,
      overflow: 'hidden',
    },
    highlightThumbnailFocused: {
      borderColor: focus.borderColor,
      transform: [{ scale: focus.scale > 1 ? 1.1 : 1 }],
      shadowColor: colors.focus,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.9,
      shadowRadius: scaledPixels(20),
      elevation: 15,
    },
    highlightsContainer: {
      paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
      paddingVertical: scaledPixels(16),
      height: scaledPixels(400),
    },
    header: {
      width: '100%',
      height: scaledPixels(700),
      position: 'relative',
    },
    headerImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    gradientLeft: {
      position: 'absolute',
      start: 0,
      top: 0,
      bottom: 0,
      width: '65%',
    },
    headerTextContainer: {
      position: 'absolute',
      start: scaledPixels(safeZones.titleSafe.horizontal),
      top: scaledPixels(safeZones.titleSafe.vertical),
      bottom: scaledPixels(safeZones.titleSafe.vertical),
      justifyContent: 'center',
      width: '55%',
    },
    cardImage: {
      width: '100%',
      height: '100%',
      borderRadius: scaledPixels(8),
    },
  });
};
