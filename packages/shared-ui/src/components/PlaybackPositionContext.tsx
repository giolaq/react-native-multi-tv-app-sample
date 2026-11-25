import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { CardData } from '../data/moviesData';
import { createPositionStore, PositionStore } from '../data/positionStore';

// Without a provider, positions last for the session only.
const PlaybackPositionContext = createContext<PositionStore>(
  createPositionStore({ read: () => null, write: () => {} }),
);

export const PlaybackPositionProvider = ({ store, children }: { store?: PositionStore; children: React.ReactNode }) => {
  const fallback = useContext(PlaybackPositionContext);
  return <PlaybackPositionContext.Provider value={store ?? fallback}>{children}</PlaybackPositionContext.Provider>;
};

/** The saved position for a title, in seconds. Updates when the player saves a new one. */
export function usePlaybackPosition(id: CardData['id']): number | undefined {
  const store = useContext(PlaybackPositionContext);
  const read = useCallback(() => store.get(id), [store, id]);
  const [position, setPosition] = useState(read);
  useEffect(() => {
    setPosition(read);
    return store.subscribe(() => setPosition(read));
  }, [store, read]);
  return position;
}

const SAVE_INTERVAL_MS = 10_000;

/**
 * Saves the playback position every 10 seconds while `active`, and once more when the player
 * stops being active (Back, end of the title, or leaving the screen). Nothing is saved before the
 * video reports a duration, so leaving during the load keeps the previous position.
 */
export function useSavePlaybackPosition(
  id: CardData['id'],
  currentTimeRef: MutableRefObject<number>,
  durationRef: MutableRefObject<number>,
  active: boolean,
) {
  const store = useContext(PlaybackPositionContext);
  useEffect(() => {
    if (!active) return;
    const save = () => store.save(id, currentTimeRef.current, durationRef.current);
    const interval = setInterval(save, SAVE_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      save();
    };
  }, [store, id, currentTimeRef, durationRef, active]);
}
