import { ImageResizeMode, ImageSourcePropType, ViewStyle } from 'react-native';
import { Direction } from '@bam.tech/lrud';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerParamList } from '../navigation/types';

export interface DrawerPlatform {
  profileImage: ImageSourcePropType;
  profileImageResizeMode?: ImageResizeMode;
  labelLines?: number;
  headerPaddingHorizontal: number;
  contentContainerStyle: ViewStyle;
  getCloseDirection: () => Direction;
  selectRoute: (
    navigation: DrawerContentComponentProps['navigation'],
    route: keyof DrawerParamList,
    toggleMenu: (isOpen: boolean) => void,
  ) => void;
}
