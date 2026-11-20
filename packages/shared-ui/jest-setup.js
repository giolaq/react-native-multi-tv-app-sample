// Shared Jest setup for mocking React Native Dimensions in tests.
// useScale.ts and accessibility.ts now lazy-load Dimensions on first use,
// so tests that render components using scaledPixels() need this mock.

// Mock NativeDeviceInfo which Dimensions depends on
jest.mock('react-native/Libraries/Utilities/NativeDeviceInfo', () => ({
  getConstants() {
    return {
      Dimensions: {
        windowPhysicalPixels: {
          width: 1920,
          height: 1080,
          scale: 1,
          fontScale: 1,
        },
        screenPhysicalPixels: {
          width: 1920,
          height: 1080,
          scale: 1,
          fontScale: 1,
        },
      },
    };
  },
}));
