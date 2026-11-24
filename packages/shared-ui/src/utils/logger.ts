const devOnly =
  (write: (...args: unknown[]) => void) =>
  (...args: unknown[]): void => {
    if (__DEV__) {
      write(...args);
    }
  };

export const logger = {
  debug: devOnly((...args) => console.log(...args)),
  info: devOnly((...args) => console.info(...args)),
  warn: devOnly((...args) => console.warn(...args)),
  error: (...args: unknown[]): void => console.error(...args),
};
