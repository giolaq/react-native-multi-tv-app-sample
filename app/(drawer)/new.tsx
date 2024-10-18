import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SpatialNavigationRoot } from 'react-tv-space-navigation';
import { scaledPixels } from '@/hooks/useScale';
import { SpatialNavigationFocusableView } from 'react-tv-space-navigation';
import { Direction } from '@bam.tech/lrud';
import { DrawerActions, useIsFocused } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { useMenuContext } from '@/components/MenuContext';

export default function NewScreen() {
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const { isOpen: isMenuOpen, toggleMenu } = useMenuContext();

  const onDirectionHandledWithoutMovement = useCallback(
    (movement: Direction) => {
      console.log("Direction " + movement);
      if (movement === 'left' && focusedIndex === 0) {
        navigation.dispatch(DrawerActions.openDrawer());
        toggleMenu(true);
      }
    },
    [toggleMenu, focusedIndex, navigation],
  );

  
  return (
    <SpatialNavigationRoot isActive={isFocused}
      onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}>
      <SpatialNavigationFocusableView onSelect={() => console.log('Button pressed!')}>
        {({ isFocused }) => (
            <View style={[styles.button, isFocused && styles.buttonFocused]}>
            <Text style={styles.buttonText}>Click me!</Text>
            </View>
        )}
    </SpatialNavigationFocusableView>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
  },button: {
    padding: scaledPixels(10),
    backgroundColor: '#3498db',
    borderRadius: scaledPixels(5),
  },
  buttonFocused: {
    backgroundColor: '#2980b9',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: scaledPixels(24),
  },
  text: {
    fontSize: scaledPixels(32),
    color: '#ffffff',
  },
});

