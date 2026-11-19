import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@amazon-devices/react-navigation__native';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from '@amazon-devices/react-native-gesture-handler';
import { AccessibilityProvider, MenuProvider } from '@multi-tv/shared-ui';
import { AsyncStorage } from '@amazon-devices/react-native-kepler';
import { createOverrideStore, overridesKey } from '@multi-tv/shared-ui/src/theme/overrideStore';
import VegaRootNavigator from './VegaRootNavigator';

const accessibilityStore = createOverrideStore({
  read: () => AsyncStorage.getItem(overridesKey),
  write: (value) => value === null ? AsyncStorage.removeItem(overridesKey) : AsyncStorage.setItem(overridesKey, value),
});

export interface VegaAppNavigatorProps {
  fontsLoaded?: boolean;
  onReady?: () => void;
}

export default function VegaAppNavigator({ fontsLoaded = true, onReady }: VegaAppNavigatorProps) {
  useEffect(() => {
    // Import remote control config for TV platforms
    if (Platform.isTV) {
      try {
        // Note: Remote control configuration from shared-ui may need adaptation for Vega
        require('@multi-tv/shared-ui/src/app/configureRemoteControl');
      } catch (error) {
        console.warn('Remote control configuration not available:', error);
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AccessibilityProvider store={accessibilityStore}>
        <NavigationContainer theme={DarkTheme}>
          <MenuProvider>
            <VegaRootNavigator />
          </MenuProvider>
        </NavigationContainer>
      </AccessibilityProvider>
    </GestureHandlerRootView>
  );
}
