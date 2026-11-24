import { StyleSheet, View, Image, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { DrawerActions, useIsFocused } from '@react-navigation/native';
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
import { colors, safeZones } from '../theme';
import PlatformLinearGradient from '../components/PlatformLinearGradient';
import { getOpenDrawerDirection } from '../utils/rtl';
import { logger } from '../utils/logger';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DrawerNavigator'>;

// Memoized MovieItem component to prevent unnecessary re-renders and optimize image source
const MovieItem = React.memo(
  ({ item, isFocused, styles }: { item: CardData; isFocused: boolean; styles: typeof gridStyles }) => {
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
      <View style={gridStyles.header}>
        <Image style={gridStyles.headerImage} source={headerImageSource} resizeMode="cover" />
        {/* Linear gradient scrim for left overlay */}
        <PlatformLinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={gridStyles.gradientLeft}
        />
        <View style={gridStyles.headerTextContainer}>
          <Text style={gridStyles.headerTitle}>{focusedItem.title}</Text>
          <Text style={gridStyles.headerDescription} numberOfLines={3}>
            {focusedItem.description}
          </Text>
        </View>
      </View>
    );
  }, [headerImageSource, focusedItem]);

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
        {({ isFocused }) => <MovieItem item={item} isFocused={isFocused} styles={gridStyles} />}
      </SpatialNavigationFocusableView>
    ),
    [navigation],
  );

  return (
    <SpatialNavigationRoot isActive={isActive} onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}>
      <View style={gridStyles.container}>
        {rows.length === 0 ? (
          <CatalogStatus catalog={catalog} />
        ) : (
          <>
            {renderHeader()}
            <SpatialNavigationScrollView offsetFromStart={scaledPixels(60)} style={gridStyles.scrollContent}>
              {rows.map((row) => (
                <View key={row.key} style={gridStyles.highlightsContainer}>
                  <Text style={gridStyles.highlightsTitle}>{row.title}</Text>
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

function CatalogStatus({ catalog }: { catalog: Catalog }) {
  return (
    <View style={gridStyles.status}>
      <Text accessibilityLiveRegion="polite" style={gridStyles.statusText}>
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

const gridStyles = StyleSheet.create({
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
    fontSize: scaledPixels(24),
  },
  scrollContent: {
    flex: 1,
    marginBottom: scaledPixels(safeZones.actionSafe.vertical),
  },
  highlightsTitle: {
    color: colors.text,
    fontSize: scaledPixels(40),
    fontWeight: 'bold',
    marginBottom: scaledPixels(16),
    marginTop: scaledPixels(20),
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: scaledPixels(56),
    fontWeight: 'bold',
    marginBottom: scaledPixels(16),
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  headerDescription: {
    color: colors.text,
    fontSize: scaledPixels(28),
    fontWeight: '500',
    lineHeight: scaledPixels(40),
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  thumbnailTextContainer: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: colors.scrimDark,
    paddingHorizontal: scaledPixels(16),
    paddingVertical: scaledPixels(12),
    borderBottomStartRadius: scaledPixels(8),
    borderBottomEndRadius: scaledPixels(8),
  },
  thumbnailText: {
    color: colors.text,
    fontSize: scaledPixels(24),
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: scaledPixels(32),
  },
  highlightThumbnail: {
    width: scaledPixels(420),
    height: scaledPixels(260),
    marginEnd: scaledPixels(20),
    backgroundColor: colors.card,
    borderRadius: scaledPixels(12),
    borderWidth: scaledPixels(5),
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  highlightThumbnailFocused: {
    borderColor: colors.focusBorder,
    borderWidth: scaledPixels(6),
    transform: [{ scale: 1.1 }],
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
  thumbnailPlaceholder: {
    backgroundColor: colors.cardElevated,
    width: '100%',
    height: '100%',
    borderRadius: scaledPixels(8),
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
  highlightsList: {
    paddingStart: scaledPixels(20),
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: scaledPixels(8),
  },
});
