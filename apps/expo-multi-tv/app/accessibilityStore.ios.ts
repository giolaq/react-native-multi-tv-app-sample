import { Settings } from 'react-native';
import { createOverrideStore, overridesKey } from '@multi-tv/shared-ui/src/theme/overrideStore';

// tvOS stores small preferences in NSUserDefaults.
export const accessibilityStore = createOverrideStore({
  read: () => Settings.get(overridesKey),
  write: (value) => Settings.set({ [overridesKey]: value }),
});
