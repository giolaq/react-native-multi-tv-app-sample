import { formatTime } from '../formatTime';

it('shows m:ss under an hour', () => {
  expect(formatTime(0)).toBe('0:00');
  expect(formatTime(5)).toBe('0:05');
  expect(formatTime(59.9)).toBe('0:59');
  expect(formatTime(60)).toBe('1:00');
  expect(formatTime(724)).toBe('12:04');
  expect(formatTime(3599)).toBe('59:59');
});

it('shows h:mm:ss from one hour', () => {
  expect(formatTime(3600)).toBe('1:00:00');
  expect(formatTime(5590)).toBe('1:33:10');
  expect(formatTime(36000 + 61)).toBe('10:01:01');
});

it('shows 0:00 for a negative or unknown time', () => {
  expect(formatTime(-3)).toBe('0:00');
  expect(formatTime(NaN)).toBe('0:00');
  expect(formatTime(Infinity)).toBe('0:00');
});
