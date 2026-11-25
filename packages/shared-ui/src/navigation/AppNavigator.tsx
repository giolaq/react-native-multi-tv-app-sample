import React, { useEffect, StrictMode } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { Platform } from 'react-native';
import { MenuProvider } from '../components/MenuContext';
import { AccessibilityProvider } from '../components/AccessibilityContext';
import { PlaybackPositionProvider } from '../components/PlaybackPositionContext';
import { GoBackConfiguration } from '../app/remote-control/GoBackConfiguration';
import RootNavigator from './RootNavigator';

import type { OverrideStore } from '../theme/overrideStore';
import type { PositionStore } from '../data/positionStore';
import { logger } from '../utils/logger';

export interface AppNavigatorProps {
  fontsLoaded?: boolean;
  accessibilityStore?: OverrideStore;
  /** Where playback positions persist. Without one, they last for the session. */
  playbackPositionStore?: PositionStore;
  onReady?: () => void;
}

export default function AppNavigator({
  fontsLoaded = true,
  onReady,
  accessibilityStore,
  playbackPositionStore,
}: AppNavigatorProps) {
  useEffect(() => {
    // Import remote control config for TV platforms
    if (Platform.isTV) {
      try {
        require('../app/configureRemoteControl');
      } catch (error) {
        logger.error('Remote control configuration not available:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded && onReady) {
      onReady();
    }
  }, [fontsLoaded, onReady]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <StrictMode>
      <AccessibilityProvider store={accessibilityStore}>
        <PlaybackPositionProvider store={playbackPositionStore}>
          <NavigationContainer theme={DarkTheme}>
            <MenuProvider>
              <GoBackConfiguration />
              <RootNavigator />
            </MenuProvider>
          </NavigationContainer>
        </PlaybackPositionProvider>
      </AccessibilityProvider>
    </StrictMode>
  );
}
