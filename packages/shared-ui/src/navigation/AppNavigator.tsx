import React, { useEffect, StrictMode } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { Platform } from 'react-native';
import { MenuProvider } from '../components/MenuContext';
import { AccessibilityProvider } from '../components/AccessibilityContext';
import { GoBackConfiguration } from '../app/remote-control/GoBackConfiguration';
import RootNavigator from './RootNavigator';

import type { OverrideStore } from '../theme/overrideStore';
import { logger } from '../utils/logger';

export interface AppNavigatorProps {
  fontsLoaded?: boolean;
  accessibilityStore?: OverrideStore;
  onReady?: () => void;
}

export default function AppNavigator({ fontsLoaded = true, onReady, accessibilityStore }: AppNavigatorProps) {
  useEffect(() => {
    // Import remote control config for TV platforms
    if (Platform.isTV) {
      try {
        require('../app/configureRemoteControl');
      } catch (error) {
        logger.warn('Remote control configuration not available:', error);
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
        <NavigationContainer theme={DarkTheme}>
          <MenuProvider>
            <GoBackConfiguration />
            <RootNavigator />
          </MenuProvider>
        </NavigationContainer>
      </AccessibilityProvider>
    </StrictMode>
  );
}
