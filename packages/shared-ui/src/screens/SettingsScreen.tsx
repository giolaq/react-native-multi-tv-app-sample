import { StyleSheet, View, Text } from 'react-native';
import {
  SpatialNavigationRoot,
  SpatialNavigationNode,
  SpatialNavigationScrollView,
  DefaultFocus,
} from 'react-tv-space-navigation';
import { DrawerActions, useIsFocused, useNavigation } from '@react-navigation/native';
import { Direction } from '@bam.tech/lrud';
import { scaledPixels } from '../hooks/useScale';
import { colors, safeZones, Theme, AccessibilityPreferences } from '../theme';
import FocusablePressable from '../components/FocusablePressable';
import { useCallback, useMemo } from 'react';
import { useMenuContext } from '../components/MenuContext';
import { useAccessibility } from '../components/AccessibilityContext';
import { getOpenDrawerDirection } from '../utils/rtl';

export default function SettingsScreen() {
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const { isOpen: isMenuOpen, toggleMenu } = useMenuContext();
  const { preferences, overrides, setPreference, resetToSystem, theme } = useAccessibility();
  const themed = useMemo(() => createThemedStyles(theme), [theme]);
  const accessibilityOptions: { key: keyof AccessibilityPreferences; label: string }[] = [
    { key: 'highContrast', label: 'High contrast' },
    { key: 'largerText', label: 'Larger text' },
    { key: 'reduceMotion', label: 'Reduce motion' },
  ];

  const onDirectionHandledWithoutMovement = useCallback(
    (movement: Direction) => {
      if (movement === getOpenDrawerDirection()) {
        navigation.dispatch(DrawerActions.openDrawer());
        toggleMenu(true);
      }
    },
    [toggleMenu, navigation],
  );

  return (
    <SpatialNavigationRoot
      isActive={isFocused && !isMenuOpen}
      onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}
    >
      <View style={styles.container}>
        <View style={styles.innerContainer}>
          <Text style={[styles.title, themed.title]} accessibilityRole="header">
            Settings
          </Text>
          <SpatialNavigationScrollView style={styles.scrollView}>
            <View style={styles.scrollContent}>
              {/* Accessibility Section: first, so it is the first thing a viewer who needs it reaches */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, themed.sectionTitle]} accessibilityRole="header">
                  Accessibility
                </Text>
                <Text style={themed.hint}>
                  {Object.keys(overrides).length === 0
                    ? 'Following your device settings.'
                    : 'Your choices here replace your device settings.'}
                </Text>
                <SpatialNavigationNode orientation="vertical">
                  <View style={styles.optionsColumn}>
                    {accessibilityOptions.map(({ key, label }, index) => {
                      const toggle = (
                        <FocusablePressable
                          key={key}
                          text={`${label}: ${preferences[key] ? 'On' : 'Off'}`}
                          onSelect={() => setPreference(key, !preferences[key])}
                          accessibilityRole="switch"
                          accessibilityLabel={label}
                          accessibilityState={{ checked: preferences[key] }}
                          style={styles.toggleButton}
                        />
                      );
                      return index === 0 ? <DefaultFocus key={key}>{toggle}</DefaultFocus> : toggle;
                    })}
                    {Object.keys(overrides).length > 0 && (
                      <FocusablePressable
                        text="Use device settings"
                        onSelect={resetToSystem}
                        style={styles.toggleButton}
                      />
                    )}
                  </View>
                </SpatialNavigationNode>
              </View>

              {/* About Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, themed.sectionTitle]}>About</Text>
                <View style={[styles.infoContainer, themed.infoContainer]}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, themed.infoLabel]}>Version</Text>
                    <Text style={[styles.infoValue, themed.infoValue]}>1.0.0</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, themed.infoLabel]}>Build</Text>
                    <Text style={[styles.infoValue, themed.infoValue]}>2025.11.04</Text>
                  </View>
                </View>
              </View>
            </View>
          </SpatialNavigationScrollView>
        </View>
      </View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    zIndex: 100,
  },
  headerContainer: {
    width: '100%',
    height: scaledPixels(700),
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradientLeft: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  gradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  innerContainer: {
    flex: 1,
    backgroundColor: 'black',
    paddingTop: scaledPixels(20),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaledPixels(safeZones.titleSafe.horizontal),
    paddingTop: scaledPixels(16),
    paddingBottom: scaledPixels(safeZones.actionSafe.vertical + 60),
  },
  title: {
    fontSize: scaledPixels(48),
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: scaledPixels(safeZones.titleSafe.horizontal),
    marginBottom: scaledPixels(32),
  },
  section: {
    marginBottom: scaledPixels(40),
  },
  sectionTitle: {
    fontSize: scaledPixels(28),
    fontWeight: '600',
    color: colors.text,
    marginBottom: scaledPixels(20),
  },
  optionsColumn: {
    gap: scaledPixels(16),
  },
  toggleButton: {
    alignSelf: 'flex-start',
    minWidth: scaledPixels(300),
  },
  infoContainer: {
    backgroundColor: colors.card,
    borderRadius: scaledPixels(12),
    padding: scaledPixels(24),
    gap: scaledPixels(16),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: scaledPixels(24),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: scaledPixels(24),
    color: colors.text,
    fontWeight: '600',
  },
});

// The parts of the screen that change with Settings > Accessibility.
const createThemedStyles = ({ colors: palette, fontSize, preferences }: Theme) =>
  StyleSheet.create({
    title: { color: palette.text, fontSize: fontSize(48) },
    sectionTitle: { color: palette.text, fontSize: fontSize(28) },
    hint: {
      color: palette.textSecondary,
      fontSize: fontSize(22),
      marginTop: -scaledPixels(8),
      marginBottom: scaledPixels(20),
    },
    infoContainer: {
      backgroundColor: palette.card,
      // A visible edge in high contrast: the card is barely lighter than the screen behind it.
      borderWidth: preferences.highContrast ? scaledPixels(2) : 0,
      borderColor: palette.border,
    },
    infoLabel: { color: palette.textSecondary, fontSize: fontSize(24) },
    infoValue: { color: palette.text, fontSize: fontSize(24) },
  });
