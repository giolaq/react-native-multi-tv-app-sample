import React from 'react';
import { View, Text, StyleSheet, DimensionValue } from 'react-native';
import { scaledPixels } from '../../hooks/useScale';
import { useTheme } from '../AccessibilityContext';
import { typography } from '../../theme/typography';
import { formatTime } from '../../utils/formatTime';

interface SeekBarProps {
  currentTime: number;
  duration: number;
}

const THUMB_SIZE = 20;

const SeekBar = React.memo(({ currentTime, duration }: SeekBarProps) => {
  const { fontSize } = useTheme();
  // A live stream reports an infinite duration: show only the elapsed time and keep the thumb at the start.
  const hasDuration = Number.isFinite(duration) && duration > 0;
  const elapsed = Math.max(hasDuration ? Math.min(currentTime, duration) : currentTime, 0);
  const percentage = hasDuration ? (elapsed / duration) * 100 : 0;
  // `start` follows the layout direction, so the thumb moves from the right in RTL.
  const thumbOffset: DimensionValue = `${percentage}%`;
  const elapsedText = formatTime(elapsed);
  const totalText = formatTime(duration);
  const time = hasDuration ? `${elapsedText} / ${totalText}` : elapsedText;
  const timeLabel = hasDuration ? `${elapsedText} of ${totalText}` : elapsedText;
  const timeStyle = [seekBarStyles.timeText, { fontSize: fontSize(typography.fontSize.md) }];

  return (
    <View style={seekBarStyles.seekbarContainer}>
      <View style={seekBarStyles.seekbarTrackArea}>
        <View style={seekBarStyles.seekbarTrack} />
        <View style={[seekBarStyles.seekbarThumb, { start: thumbOffset }]} />
      </View>
      <Text style={timeStyle} accessibilityLabel={timeLabel} numberOfLines={1}>
        {time}
      </Text>
    </View>
  );
});

const seekBarStyles = StyleSheet.create({
  seekbarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginEnd: scaledPixels(80),
  },
  seekbarTrackArea: {
    flex: 1,
    height: scaledPixels(40),
    justifyContent: 'center',
  },
  seekbarTrack: {
    width: '100%',
    height: scaledPixels(5),
    backgroundColor: '#888',
    borderRadius: scaledPixels(2.5),
  },
  seekbarThumb: {
    position: 'absolute',
    width: scaledPixels(THUMB_SIZE),
    height: scaledPixels(THUMB_SIZE),
    borderRadius: scaledPixels(THUMB_SIZE / 2),
    // Centre the thumb on the playback position instead of starting it there.
    marginStart: -scaledPixels(THUMB_SIZE / 2),
    backgroundColor: '#fff',
  },
  timeText: {
    flexShrink: 0,
    marginStart: scaledPixels(20),
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
});

export default SeekBar;
