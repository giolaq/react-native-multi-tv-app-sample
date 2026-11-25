import { File, Paths } from 'expo-file-system';
import { createPositionStore, positionsKey } from '@multi-tv/shared-ui/src/data/positionStore';

export const playbackPositionStore = createPositionStore({
  read: () => {
    const file = new File(Paths.document, positionsKey);
    return file.exists ? file.text() : null;
  },
  write: (value) => {
    const file = new File(Paths.document, positionsKey);
    if (value !== null) file.write(value);
    else if (file.exists) file.delete();
  },
});
