import { File, Paths } from 'expo-file-system';
import { createOverrideStore, overridesKey } from '@multi-tv/shared-ui/src/theme/overrideStore';

export const accessibilityStore = createOverrideStore({
  read: () => {
    const file = new File(Paths.document, overridesKey);
    return file.exists ? file.text() : null;
  },
  write: (value) => {
    const file = new File(Paths.document, overridesKey);
    if (value !== null) file.write(value);
    else if (file.exists) file.delete();
  },
});
