import { logger } from '../../../packages/shared-ui/src/utils/logger';

type Level = 'debug' | 'info' | 'warn' | 'error';

const consoleMethod: Record<Level, 'log' | 'info' | 'warn' | 'error'> = {
  debug: 'log',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

const setDev = (value: boolean | undefined) => {
  (global as { __DEV__?: boolean }).__DEV__ = value;
};

describe('logger', () => {
  const originalDev = (global as { __DEV__?: boolean }).__DEV__;
  const spies = {
    log: jest.spyOn(console, 'log').mockImplementation(() => {}),
    info: jest.spyOn(console, 'info').mockImplementation(() => {}),
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  };

  beforeEach(() => {
    Object.values(spies).forEach((spy) => spy.mockClear());
  });

  afterAll(() => {
    setDev(originalDev);
    Object.values(spies).forEach((spy) => spy.mockRestore());
  });

  describe('in a release build', () => {
    beforeEach(() => setDev(false));

    it.each(['debug', 'info', 'warn'] as Level[])('%s writes nothing', (level) => {
      logger[level]('[Tag]', 'message', { detail: 1 });

      Object.values(spies).forEach((spy) => expect(spy).not.toHaveBeenCalled());
    });

    it('error stays visible with all arguments', () => {
      const failure = new Error('boom');

      logger.error('[Tag] failed', failure);

      expect(spies.error).toHaveBeenCalledWith('[Tag] failed', failure);
    });
  });

  describe('in a development build', () => {
    beforeEach(() => setDev(true));

    it.each(['debug', 'info', 'warn', 'error'] as Level[])('%s writes to the console', (level) => {
      logger[level]('[Tag]', 'message');

      expect(spies[consoleMethod[level]]).toHaveBeenCalledWith('[Tag]', 'message');
    });
  });
});
