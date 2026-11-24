import mitt from 'mitt';
import type { HWEvent } from 'react-native';
import { SupportedKeys } from './SupportedKeys';
import { RemoteControlManagerInterface } from './RemoteControlManager.interface';
import { logger } from '../../utils/logger';

// Map Vega/Kepler HWEvent eventType to SupportedKeys.
// RN 0.83 reports normalized names on newer Vega OS and raw key names on older ones, so map both.
const EVENT_TYPE_MAPPING: Record<string, SupportedKeys> = {
  left: SupportedKeys.Left,
  right: SupportedKeys.Right,
  down: SupportedKeys.Down,
  up: SupportedKeys.Up,
  select: SupportedKeys.Enter,
  enter: SupportedKeys.Enter,
  back: SupportedKeys.Back,
  playpause: SupportedKeys.PlayPause,
  skip_backward: SupportedKeys.Rewind,
  rewind: SupportedKeys.Rewind,
  skip_forward: SupportedKeys.FastForward,
  fastforward: SupportedKeys.FastForward,
  forward: SupportedKeys.FastForward,
};

class RemoteControlManager implements RemoteControlManagerInterface {
  private eventEmitter = mitt<{ keyDown: SupportedKeys }>();
  private tvEventHandler: any;

  constructor() {
    // Initialize TVEventHandler for Vega/Kepler platform
    // Import dynamically to avoid issues with types
    const { TVEventHandler } = require('react-native');
    this.tvEventHandler = new TVEventHandler();
    this.tvEventHandler.enable(this, this.handleHWEvent);
    logger.debug('[RemoteControlManager.kepler] TVEventHandler enabled');
  }

  private handleHWEvent = (_component: any, event: HWEvent): void => {
    // Only handle KEY_DOWN events (eventKeyAction = 0)
    // eventKeyAction: 0 = KEY_DOWN, 1 = KEY_UP, -1 = default
    if (event.eventKeyAction === 0 || event.eventKeyAction === undefined) {
      const mappedKey = EVENT_TYPE_MAPPING[event.eventType];
      if (mappedKey) {
        logger.debug(`[Kepler] Key pressed: ${mappedKey} (eventType: ${event.eventType})`);
        this.eventEmitter.emit('keyDown', mappedKey);
      }
    }
  };

  addKeydownListener = (listener: (event: SupportedKeys) => void): ((event: SupportedKeys) => void) => {
    this.eventEmitter.on('keyDown', listener);
    logger.debug('[RemoteControlManager.kepler] Key listener added');
    return listener;
  };

  removeKeydownListener = (listener: (event: SupportedKeys) => void): void => {
    this.eventEmitter.off('keyDown', listener);
    logger.debug('[RemoteControlManager.kepler] Key listener removed');
  };

  emitKeyDown = (key: SupportedKeys): void => {
    this.eventEmitter.emit('keyDown', key);
  };

  cleanup = (): void => {
    this.tvEventHandler.disable();
    logger.debug('[RemoteControlManager.kepler] TVEventHandler disabled');
  };
}

export default new RemoteControlManager();