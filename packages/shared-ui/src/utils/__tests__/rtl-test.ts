import { I18nManager } from 'react-native';
import { getCloseDrawerDirection, getOpenDrawerDirection, isRTL } from '../rtl';

jest.mock('react-native', () => ({ I18nManager: { isRTL: false } }));

const setRTL = (value: boolean) => {
  (I18nManager as { isRTL: boolean }).isRTL = value;
};

describe('left-to-right layout', () => {
  beforeEach(() => setRTL(false));

  it('opens the drawer leftwards and closes it rightwards', () => {
    expect(isRTL()).toBe(false);
    expect(getOpenDrawerDirection()).toBe('left');
    expect(getCloseDrawerDirection()).toBe('right');
  });
});

describe('right-to-left layout', () => {
  beforeEach(() => setRTL(true));

  it('mirrors the drawer directions', () => {
    expect(isRTL()).toBe(true);
    expect(getOpenDrawerDirection()).toBe('right');
    expect(getCloseDrawerDirection()).toBe('left');
  });
});
