import type { AccessibilityPreferences } from './accessibility';

type Overrides = Partial<AccessibilityPreferences>;

interface OverrideStorage {
  read(): string | null | Promise<string | null>;
  write(value: string | null): void | Promise<void>;
}

export function createOverrideStore(storage: OverrideStorage) {
  let pending = Promise.resolve();
  return {
    async load(): Promise<Overrides> {
      await pending;
      try {
        const raw = await storage.read();
        const saved = raw && JSON.parse(raw);
        const overrides: Overrides = {};
        for (const key of ['highContrast', 'largerText', 'reduceMotion'] as const) {
          if (typeof saved?.[key] === 'boolean') overrides[key] = saved[key];
        }
        return overrides;
      } catch {
        return {};
      }
    },
    save(overrides: Overrides) {
      const value = Object.keys(overrides).length ? JSON.stringify(overrides) : null;
      // Complete writes in input order, including a reset immediately followed by a new choice.
      pending = pending
        .then(() => storage.write(value))
        .catch(() => {
          // Storage may be unavailable (e.g. private browsing). Session choices still apply.
        });
    },
  };
}

export type OverrideStore = ReturnType<typeof createOverrideStore>;
export const overridesKey = 'multi-tv.accessibility-overrides';
