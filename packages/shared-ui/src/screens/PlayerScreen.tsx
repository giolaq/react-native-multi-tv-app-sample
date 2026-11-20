import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Text, View, Platform, StyleSheet } from 'react-native';
import { DefaultFocus, SpatialNavigationNode, SpatialNavigationRoot } from 'react-tv-space-navigation';
import { useIsFocused } from '@react-navigation/native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import RemoteControlManager from '../app/remote-control/RemoteControlManager';
import { SupportedKeys } from '../app/remote-control/SupportedKeys';
import FocusablePressable from '../components/FocusablePressable';
import VideoOverlay from '../components/player/VideoOverlay';
import { VideoRef } from 'react-native-video';
import VideoPlayer from '../components/player/VideoPlayer';
import { RootStackParamList } from '../navigation/types';

const SHOW_NATIVE_CONTROLS = Platform.OS === 'ios';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Player'>;

export default function PlayerScreen() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const { movie, headerImage } = route.params;
  const isFocused = useIsFocused();
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);
  const [isVideoBuffering, setIsVideoBuffering] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const videoRef = useRef<VideoRef>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef<number>(0);
  const [duration, setDuration] = useState(0);

  const showControls = useCallback(() => {
    setControlsVisible(true);

    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 5000);
  }, []);

  const seek = useCallback(
    (time: number) => {
      if (time < 0) {
        time = 0;
      } else if (time > duration) {
        time = duration;
      }
      videoRef.current?.seek(time);
      currentTimeRef.current = time;
      setCurrentTime(time);
      showControls();
    },
    [duration, showControls],
  );

  const handleProgress = useCallback((time: number) => {
    currentTimeRef.current = time;
    setCurrentTime(time);
  }, []);

  const togglePausePlay = useCallback(() => {
    setPaused((prev) => !prev);
    showControls();
  }, [showControls]);

  useEffect(() => {
    if (SHOW_NATIVE_CONTROLS || failed || !isFocused) return;

    const handleKeyDown = (key: SupportedKeys) => {
      switch (key) {
        case SupportedKeys.Right:
        case SupportedKeys.FastForward:
          seek(currentTimeRef.current + 10);
          break;
        case SupportedKeys.Left:
        case SupportedKeys.Rewind:
          seek(currentTimeRef.current - 10);
          break;
        case SupportedKeys.Back:
          // GoBackConfiguration handles this key for the navigation stack.
          return;
        case SupportedKeys.PlayPause:
          togglePausePlay();
          break;
        default:
          showControls();
          break;
      }
    };

    const listener = RemoteControlManager.addKeydownListener(handleKeyDown);
    return () => {
      RemoteControlManager.removeKeydownListener(listener);
    };
  }, [seek, togglePausePlay, showControls, failed, isFocused]);

  useEffect(
    () => () => {
      if (hideControlsTimeoutRef.current !== null) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    },
    [],
  );

  const handleLoad = useCallback(
    (loadedDuration: number) => {
      setDuration(loadedDuration);
      if (loadedDuration > 0 && !SHOW_NATIVE_CONTROLS) {
        showControls();
      }
    },
    [showControls],
  );

  if (failed) {
    const retry = () => {
      currentTimeRef.current = 0;
      setDuration(0);
      setCurrentTime(0);
      setPaused(false);
      setFailed(false);
    };

    return (
      <SpatialNavigationRoot isActive={isFocused}>
        <View style={[playerStyles.container, playerStyles.errorPanel]}>
          <Text accessibilityRole="alert" style={playerStyles.errorText}>
            Unable to play this video.
          </Text>
          <SpatialNavigationNode orientation="vertical">
            <View style={playerStyles.errorActions}>
              <DefaultFocus>
                <FocusablePressable text="Retry" onSelect={retry} />
              </DefaultFocus>
              <FocusablePressable text="Back" onSelect={() => navigation.goBack()} />
            </View>
          </SpatialNavigationNode>
        </View>
      </SpatialNavigationRoot>
    );
  }

  return (
    <SpatialNavigationRoot isActive={isFocused && Platform.OS === 'android'}>
      <View style={playerStyles.container}>
        <VideoPlayer
          ref={videoRef}
          movie={movie}
          headerImage={headerImage}
          paused={paused}
          controls={SHOW_NATIVE_CONTROLS}
          onBuffer={setIsVideoBuffering}
          onProgress={handleProgress}
          onLoad={handleLoad}
          onError={() => {
            setControlsVisible(false);
            setIsVideoBuffering(false);
            setFailed(true);
          }}
          onEnd={() => {
            setPaused(true);
            navigation.goBack();
          }}
        />

        {!SHOW_NATIVE_CONTROLS && duration > 0 && (
          <VideoOverlay
            visible={controlsVisible}
            paused={paused}
            onPlayPause={togglePausePlay}
            onExit={() => navigation.goBack()}
            currentTime={currentTime}
            duration={duration}
            isBuffering={isVideoBuffering}
          />
        )}
      </View>
    </SpatialNavigationRoot>
  );
}

const playerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorPanel: { justifyContent: 'center', paddingHorizontal: '10%', gap: 20 },
  errorActions: { gap: 20 },
  errorText: { fontSize: 32, color: 'white' },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
    zIndex: 1,
  },
});
