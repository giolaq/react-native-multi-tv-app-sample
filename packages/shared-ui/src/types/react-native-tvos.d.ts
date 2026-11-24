/**
 * Type declarations for react-native-tvos specific APIs
 * These types exist at runtime in react-native-tvos but are not in standard @types/react-native
 */

declare module 'react-native' {
  /**
   * Hardware event from TV remote control
   * Available in react-native-tvos for tvOS and Fire TV platforms
   */
  export interface HWEvent {
    eventType: string;
    eventKeyAction?: number;
    tag?: number;
  }

  /**
   * Event subscription returned by TV event listeners
   */
  export interface EventSubscription {
    remove(): void;
  }

  /**
   * TV event handler for processing remote control events
   * Available in react-native-tvos for tvOS and Fire TV platforms
   */
  export class TVEventHandler {
    constructor();
    enable<T>(component: T, callback: (component: T, event: HWEvent) => void): void;
    disable(): void;
    static addListener(callback: (event: HWEvent) => void): EventSubscription;
  }
}

/**
 * Global object declarations for React Native environment
 */
declare const global: typeof globalThis;

export {};
