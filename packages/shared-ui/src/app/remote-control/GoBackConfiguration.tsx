import React, { useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import RemoteControlManager from './RemoteControlManager';
import { SupportedKeys } from './SupportedKeys';
import { useMenuContext } from '../../components/MenuContext';
import { logger } from '../../utils/logger';

export const GoBackConfiguration: React.FC = () => {
  const navigation = useNavigation();
  const { isOpen: isMenuOpen } = useMenuContext();

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      if (isMenuOpen) {
        logger.debug('Menu is open during back navigation');
      }
    }
  }, [navigation, isMenuOpen]);

  useEffect(() => {
    const remoteControlListener = (pressedKey: SupportedKeys) => {
      if (pressedKey === SupportedKeys.Back) {
        handleBackPress();
      }
    };

    RemoteControlManager.addKeydownListener(remoteControlListener);
    return () => RemoteControlManager.removeKeydownListener(remoteControlListener);
  }, [handleBackPress]);

  return null;
};
