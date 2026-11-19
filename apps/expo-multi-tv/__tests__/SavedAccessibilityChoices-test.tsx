import React from 'react';
import { AccessibilityInfo } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import {
  AccessibilityProvider,
  useAccessibility,
} from '../../../packages/shared-ui/src/components/AccessibilityContext';
import { createOverrideStore } from '../../../packages/shared-ui/src/theme/overrideStore';

jest.mock('../../../packages/shared-ui/src/hooks/useScale', () => ({ scaledPixels: (size: number) => size }));

it('restores only explicit choices after restart and follows device changes again after reset', async () => {
  let saved: string | null = null;
  const store = createOverrideStore({
    read: () => saved,
    write: (value) => {
      saved = value;
    },
  });
  let screen!: ReturnType<typeof useAccessibility>;
  let setDeviceContrast!: (enabled: boolean) => void;
  jest.spyOn(AccessibilityInfo, 'isHighTextContrastEnabled').mockResolvedValue(false);
  const events: {
    addEventListener(event: 'highTextContrastChanged', listener: typeof setDeviceContrast): { remove(): void };
  } = AccessibilityInfo;
  jest.spyOn(events, 'addEventListener').mockImplementation((event, listener) => {
    if (event === 'highTextContrastChanged') setDeviceContrast = listener;
    return { remove: jest.fn() };
  });
  const Probe = () => {
    screen = useAccessibility();
    return null;
  };
  let tree!: TestRenderer.ReactTestRenderer;
  const mount = () =>
    act(async () => {
      tree = TestRenderer.create(
        <AccessibilityProvider store={store}>
          <Probe />
        </AccessibilityProvider>,
      );
    });
  try {
    await mount();
    await act(async () => {
      screen.setPreference('highContrast', true);
      screen.setPreference('reduceMotion', false);
    });
    await act(async () => tree.unmount());
    await mount();
    expect(screen.overrides).toEqual({ highContrast: true, reduceMotion: false });
    await act(async () => screen.resetToSystem());
    expect(saved).toBeNull();
    await act(async () => tree.unmount());
    await mount();
    expect(screen.preferences.highContrast).toBe(false);
    await act(async () => setDeviceContrast(true));
    expect(screen.preferences.highContrast).toBe(true);
    expect(screen.overrides).toEqual({});
  } finally {
    await act(async () => tree?.unmount());
    jest.restoreAllMocks();
  }
});

it('orders rapid writes and waits for the final reset before loading on remount', async () => {
  let finish!: () => void;
  const writes: (string | null)[] = [];
  let saved: string | null = null;
  const store = createOverrideStore({
    read: () => saved,
    write: async (value) => {
      if (!writes.length)
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
      writes.push(value);
      saved = value;
    },
  });
  store.save({ highContrast: true });
  store.save({ highContrast: false });
  store.save({});
  const loaded = store.load();
  await Promise.resolve();
  finish();
  await expect(loaded).resolves.toEqual({});
  expect(writes).toEqual(['{"highContrast":true}', '{"highContrast":false}', null]);
});

it.each([
  ['invalid', {}],
  ['null', {}],
  ['{"largerText":true,"highContrast":0,"fontSize":42}', { largerText: true }],
])('reads valid choices from %s', async (raw, expected) => {
  const store = createOverrideStore({ read: () => String(raw), write: () => {} });
  await expect(store.load()).resolves.toEqual(expected);
});

it('applies the saved theme before exposing the settings controls', async () => {
  let finishLoad!: (value: string) => void;
  const store = createOverrideStore({
    read: () =>
      new Promise<string>((resolve) => {
        finishLoad = resolve;
      }),
    write: jest.fn(),
  });
  const showSettings = jest.fn();
  const Settings = () => {
    showSettings(useAccessibility().preferences.highContrast);
    return null;
  };
  let tree!: TestRenderer.ReactTestRenderer;
  try {
    await act(async () => {
      tree = TestRenderer.create(
        <AccessibilityProvider store={store}>
          <Settings />
        </AccessibilityProvider>,
      );
    });
    expect(showSettings).not.toHaveBeenCalled();
    await act(async () => finishLoad('{"highContrast":true}'));
    expect(showSettings).toHaveBeenCalledWith(true);
  } finally {
    await act(async () => tree?.unmount());
  }
});
