import { createPositionStore, positionsKey } from '@multi-tv/shared-ui/src/data/positionStore';

export const playbackPositionStore = createPositionStore({
  read: () => localStorage.getItem(positionsKey),
  write: (value) => {
    if (value === null) localStorage.removeItem(positionsKey);
    else localStorage.setItem(positionsKey, value);
  },
});
