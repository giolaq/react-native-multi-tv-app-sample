import { createOverrideStore, overridesKey } from '@multi-tv/shared-ui/src/theme/overrideStore';

export const accessibilityStore = createOverrideStore({
  read: () => localStorage.getItem(overridesKey),
  write: (value) => {
    if (value === null) localStorage.removeItem(overridesKey);
    else localStorage.setItem(overridesKey, value);
  },
});
