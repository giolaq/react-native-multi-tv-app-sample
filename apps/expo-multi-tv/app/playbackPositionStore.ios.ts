import { Settings } from 'react-native';
import { createPositionStore, positionsKey } from '@multi-tv/shared-ui/src/data/positionStore';

// tvOS stores small values in NSUserDefaults.
export const playbackPositionStore = createPositionStore({
  read: () => Settings.get(positionsKey),
  write: (value) => Settings.set({ [positionsKey]: value }),
});
