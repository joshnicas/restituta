import AppText from "../components/app-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { ActivityIndicator } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    AppState,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioPreferences } from "../lib/audio-preferences";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { API_BASE } from "../lib/config";
import { getSongs, type Song } from "../lib/api";

export default function SongsScreen() {
  const router = useRouter();
  const { musicEnabled, preferencesLoaded } = useAudioPreferences();
  const [songs, setSongs] = useState<Song[]>([]);
  const [activeSong, setActiveSong] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [videoBuffering, setVideoBuffering] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoFullscreen, setVideoFullscreen] = useState(false);
  const [seekBarWidth, setSeekBarWidth] = useState(0);
  const [videoFrame, setVideoFrame] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const videoContainerRef = useRef<View>(null);
  const [isDark, setIsDark] = useState(false);
  const videoPlayer = useVideoPlayer(null, (player) => {
    player.loop = false;
    player.timeUpdateEventInterval = 0.5;
  });
  const videoViewRef = useRef<VideoView>(null);
  const audioPlayer = useAudioPlayer(null);
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  useEffect(() => {
    const subscription = videoPlayer.addListener("statusChange", ({ status }) => {
      if (status === "loading") setVideoBuffering(true);
      if (status === "readyToPlay") {
        setVideoBuffering(false);
        setVideoDuration(videoPlayer.duration || 0);
      }
      if (status === "error") {
        setVideoBuffering(false);
        setPlaybackError(true);
      }
    });
    const timeSubscription = videoPlayer.addListener("timeUpdate", ({ currentTime }) => {
      setVideoCurrentTime(currentTime);
      setVideoDuration(videoPlayer.duration || 0);
    });
    const playingSubscription = videoPlayer.addListener("playingChange", ({ isPlaying }) => setVideoPlaying(isPlaying));
    return () => {
      subscription.remove();
      timeSubscription.remove();
      playingSubscription.remove();
    };
  }, [videoPlayer]);
  const selectedSong = songs.find((song) => song.id === activeSong);
  const audioPlaybackLoading = selectedSong?.mediaType === "AUDIO" && (!audioStatus.isLoaded || audioStatus.isBuffering);
  const playbackLoading = selectedSong?.mediaType === "VIDEO"
    ? videoBuffering
    : audioPlaybackLoading;
  const stopVideo = useCallback(() => {
    try {
      videoPlayer.pause();
      videoPlayer.currentTime = 0;
      setVideoCurrentTime(0);
      setVideoPlaying(false);
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    } catch {
      // The player may already be released during route cleanup.
    }
    setVideoBuffering(false);
    setActiveSong(null);
  }, [audioPlayer, videoPlayer]);

  useEffect(() => {
    let active = true;
    getSongs()
      .then(({ songs: loadedSongs }) => { if (active) setSongs(loadedSongs); })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const playSong = useCallback((song: Song) => {
    try {
      setPlaybackError(false);
      setVideoBuffering(song.mediaType === "VIDEO");
      videoPlayer.pause();
      audioPlayer.pause();
      if (song.mediaType === "AUDIO") {
        audioPlayer.replace(mediaUrl(song.url));
        audioPlayer.currentTime = 0;
        audioPlayer.play();
      } else {
        videoPlayer.replace(mediaUrl(song.url));
        videoPlayer.currentTime = 0;
        setVideoCurrentTime(0);
        setVideoDuration(0);
        videoPlayer.play();
      }
      setActiveSong(song.id);
    } catch {
      setPlaybackError(true);
      setActiveSong(null);
    }
  }, [audioPlayer, videoPlayer]);

  const isVideoSong = selectedSong?.mediaType === "VIDEO";
  const measureVideoFrame = useCallback(() => {
    videoContainerRef.current?.measureInWindow((x, y, width, height) => {
      setVideoFrame({ x, y, width, height });
    });
  }, []);
  useEffect(() => {
    if (isVideoSong && videoBuffering) requestAnimationFrame(measureVideoFrame);
  }, [isVideoSong, measureVideoFrame, videoBuffering]);
  const currentTime = isVideoSong ? videoCurrentTime : audioStatus.currentTime;
  const duration = isVideoSong ? videoDuration : audioStatus.duration;
  const isPlaying = isVideoSong ? videoPlaying : audioStatus.playing;
  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const togglePlayback = useCallback(() => {
    if (!selectedSong) return;
    try {
      if (isVideoSong) {
        if (videoPlayer.playing) videoPlayer.pause();
        else {
          if (videoPlayer.duration > 0 && videoPlayer.currentTime >= videoPlayer.duration) videoPlayer.currentTime = 0;
          videoPlayer.play();
        }
      } else if (audioStatus.playing) {
        audioPlayer.pause();
      } else {
        if (audioStatus.duration > 0 && audioStatus.currentTime >= audioStatus.duration) void audioPlayer.seekTo(0);
        audioPlayer.play();
      }
    } catch {
      setPlaybackError(true);
    }
  }, [audioPlayer, audioStatus.currentTime, audioStatus.duration, audioStatus.playing, isVideoSong, selectedSong, videoPlayer]);

  const seekBy = useCallback((seconds: number) => {
    const target = Math.min(Math.max(currentTime + seconds, 0), duration || Number.MAX_SAFE_INTEGER);
    if (isVideoSong) {
      videoPlayer.currentTime = target;
      setVideoCurrentTime(target);
    }
    else void audioPlayer.seekTo(target).catch(() => setPlaybackError(true));
  }, [audioPlayer, currentTime, duration, isVideoSong, videoPlayer]);

  const seekFromX = useCallback((x: number) => {
    if (!seekBarWidth || !duration) return;
    const target = Math.min(Math.max(x / seekBarWidth, 0), 1) * duration;
    if (isVideoSong) {
      videoPlayer.currentTime = target;
      setVideoCurrentTime(target);
    }
    else void audioPlayer.seekTo(target).catch(() => setPlaybackError(true));
  }, [audioPlayer, duration, isVideoSong, seekBarWidth, videoPlayer]);

  const enterVideoFullscreen = useCallback(async () => {
    try {
      setVideoFullscreen(true);
      await videoViewRef.current?.enterFullscreen();
    } catch {
      setVideoFullscreen(false);
      setPlaybackError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      return stopVideo;
    }, [stopVideo]),
  );

  useEffect(() => {
    if (!preferencesLoaded || !musicEnabled) {
      stopVideo();
    }
  }, [musicEnabled, preferencesLoaded, stopVideo]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        stopVideo();
      }
    });

    return () => subscription.remove();
  }, [stopVideo]);

  useEffect(() => {
    AsyncStorage.getItem("kido.theme").then((theme) => {
      setIsDark(theme === "dark");
    });
  }, []);
  const [fontsLoaded] = useFonts({
    FredokaRegular: require("../assets/fonts/Fredoka-Regular.ttf"),
    FredokaMedium: require("../assets/fonts/Fredoka-Medium.ttf"),
    FredokaBold: require("../assets/fonts/Fredoka-Bold.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.darkSafeArea]}>
      <Stack.Screen options={{ orientation: videoFullscreen ? "landscape" : "portrait" }} />
      <View style={[styles.backgroundGlow, isDark && styles.darkGlow]} />
      <View style={[styles.backgroundGlowTwo, isDark && styles.darkGlowTwo]} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.backButton, isDark && styles.darkBackButton]}
        >
          <AppText style={[styles.backText, isDark && styles.darkText]}>Back</AppText>
        </Pressable>
        <AppText style={[styles.title, isDark && styles.darkText]}>Songs</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={measureVideoFrame}
        scrollEventThrottle={100}
      >
        <View style={[styles.heroCard, isDark && styles.darkCard]}>
          <AppText style={[styles.heroTitle, isDark && styles.darkText]}>Play a song</AppText>
          <AppText style={[styles.heroSubtitle, isDark && styles.darkMutedText]}>{activeSong !== null ? songs.find((song) => song.id === activeSong)?.title : "Choose a rhythm for your next adventure."}</AppText>
          {activeSong !== null && (
            <>
              {isVideoSong ? (
                <View ref={videoContainerRef} style={styles.videoContainer} onLayout={measureVideoFrame}>
                  <VideoView
                    ref={videoViewRef}
                    player={videoPlayer}
                    style={styles.video}
                    nativeControls={false}
                    surfaceType="textureView"
                    contentFit="contain"
                    fullscreenOptions={{ enable: true, orientation: "landscape", autoExitOnRotate: true }}
                    onFullscreenEnter={() => setVideoFullscreen(true)}
                    onFullscreenExit={() => setVideoFullscreen(false)}
                  />
                </View>
              ) : null}
              {isVideoSong ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View video fullscreen in landscape"
                  onPress={() => { void enterVideoFullscreen(); }}
                  style={[styles.fullscreenButton, isDark && styles.darkControl]}
                >
                  <AppText style={[styles.fullscreenButtonText, isDark && styles.darkText]}>⛶  Full screen</AppText>
                </Pressable>
              ) : null}
              {audioPlaybackLoading ? <View style={styles.loadingNotice} accessibilityLiveRegion="polite">
                <ActivityIndicator color={isDark ? "#fbbf24" : "#8a5a1d"} />
                <AppText style={[styles.loadingText, isDark && styles.darkMutedText]}>
                  Getting {selectedSong?.title} ready. This may take a moment…
                </AppText>
              </View> : null}
              <View style={styles.playerControls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go back 10 seconds"
                  onPress={() => seekBy(-10)}
                  style={[styles.skipButton, isDark && styles.darkAdjustButton]}
                >
                  <AppText style={[styles.skipIcon, isDark && styles.darkAdjustText]}>
                    ↶
                  </AppText>
                  <AppText style={[styles.skipLabel, isDark && styles.darkAdjustText]}>10 sec</AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? "Pause song" : "Play song"}
                  onPress={togglePlayback}
                  style={[styles.mainPlayButton, isDark && styles.darkMainPlayButton]}
                >
                  <AppText style={styles.mainPlayIcon}>{isPlaying ? "Ⅱ" : "▶"}</AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go forward 10 seconds"
                  onPress={() => seekBy(10)}
                  style={[styles.skipButton, isDark && styles.darkAdjustButton]}
                >
                  <AppText style={[styles.skipIcon, isDark && styles.darkAdjustText]}>↷</AppText>
                  <AppText style={[styles.skipLabel, isDark && styles.darkAdjustText]}>10 sec</AppText>
                </Pressable>
              </View>
              <View
                style={styles.seekBarHitArea}
                onLayout={(event) => setSeekBarWidth(event.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => duration > 0}
                onMoveShouldSetResponder={() => duration > 0}
                onResponderGrant={(event) => seekFromX(event.nativeEvent.locationX)}
                onResponderMove={(event) => seekFromX(event.nativeEvent.locationX)}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel="Song progress"
                accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(currentTime) }}
              >
                <View style={[styles.seekTrack, isDark && styles.darkSeekTrack]}>
                  <View style={[styles.seekFill, { width: `${progress * 100}%` }]} />
                  <View style={[styles.seekThumb, { left: `${progress * 100}%` }]} />
                </View>
                <View style={styles.seekTimes}>
                  <AppText style={[styles.timeText, isDark && styles.darkMutedText]}>{formatTime(currentTime)}</AppText>
                  <AppText style={[styles.timeText, isDark && styles.darkMutedText]}>{formatTime(duration)}</AppText>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel song"
                onPress={stopVideo}
                style={[styles.cancelButton, isDark && styles.darkControl]}
              >
                <AppText style={[styles.cancelText, isDark && styles.darkText]}>Cancel</AppText>
              </Pressable>
              {playbackError ? <AppText style={styles.playbackError}>Could not play this song. Check your connection and try again.</AppText> : null}
            </>
          )}
        </View>

        {loading ? <AppText style={[styles.empty, isDark && styles.darkMutedText]}>Loading songs...</AppText> : null}
        {loadError ? <AppText style={[styles.empty, isDark && styles.darkMutedText]}>Could not load songs. Please try again later.</AppText> : null}
        {!loading && !loadError && songs.length === 0 ? <AppText style={[styles.empty, isDark && styles.darkMutedText]}>No songs are available yet.</AppText> : null}
        <View style={styles.songList}>
          {songs.map((song, index) => {
            const isActive = activeSong === song.id;
            return (
              <Pressable
                key={song.title}
                accessibilityRole="button"
                accessibilityLabel={`${isActive && isPlaying ? "Pause" : "Play"} ${song.title}`}
                onPress={() => {
                  if (!preferencesLoaded) return;
                  if (isActive) {
                    togglePlayback();
                  } else {
                    playSong(song);
                  }
                }}
                style={[
                  styles.songCard,
                  isDark && styles.darkSongCard,
                  isActive && (isDark ? styles.darkActiveSongCard : styles.activeSongCard),
                ]}
              >
                <View
                  style={[
                    styles.playButton,
                    isDark && styles.darkPlayButton,
                    isActive && styles.activePlayButton,
                  ]}
                >
                  {isActive && playbackLoading ? <ActivityIndicator color={isDark ? "#263044" : "#fff"} /> : <AppText style={[styles.playText, isDark && styles.darkText]}>{isActive && isPlaying ? "Ⅱ" : "▶"}</AppText>}
                </View>
                <View style={styles.songText}>
                  <AppText style={[styles.songTitle, isDark && styles.darkText]}>{song.title}{isActive && playbackLoading ? " · Loading" : ""}</AppText>
                  <AppText style={[styles.songSubtitle, isDark && styles.darkMutedText]}>{song.subtitle}</AppText>
                </View>
                <AppText style={[styles.duration, isDark && styles.darkMutedText]}>{song.duration}</AppText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <Modal
        visible={Boolean(isVideoSong && videoBuffering)}
        transparent
        animationType="none"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => undefined}
      >
        <View pointerEvents="none" style={styles.videoSpinnerModal} accessibilityRole="progressbar" accessibilityLabel="Video loading">
          {videoFrame.width > 0 && videoFrame.height > 0 ? (
            <View style={[styles.videoSpinnerBadge, {
              left: videoFrame.x + videoFrame.width / 2 - 34,
              top: videoFrame.y + videoFrame.height / 2 - 34,
            }]}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          ) : (
            <View style={styles.videoSpinnerBadge}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function mediaUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

function formatTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8c25a",
  },
  darkSafeArea: {
    backgroundColor: "#111827",
  },
  backgroundGlow: {
    position: "absolute",
    top: -100,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255, 247, 211, 0.42)",
  },
  backgroundGlowTwo: {
    position: "absolute",
    bottom: -120,
    left: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  darkGlow: {
    backgroundColor: "rgba(75, 85, 99, 0.28)",
  },
  darkGlowTwo: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    minWidth: 62,
    minHeight: 38,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(80, 54, 23, 0.16)",
  },
  darkBackButton: {
    backgroundColor: "rgba(148, 163, 184, 0.18)",
  },
  backText: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 15,
  },
  title: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 28,
  },
  headerSpacer: {
    width: 62,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
    alignItems: "center",
  },
  heroCard: {
    width: "100%",
    maxWidth: 420,
    padding: 24,
    alignItems: "center",
    borderRadius: 28,
    backgroundColor: "rgba(255, 244, 208, 0.94)",
    borderWidth: 3,
    borderColor: "#f4b942",
    shadowColor: "#5b3218",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  darkCard: {
    backgroundColor: "#1f2937",
    borderColor: "rgba(148, 163, 184, 0.28)",
  },
  heroTitle: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 24,
  },
  heroSubtitle: {
    marginTop: 6,
    color: "#6b4a28",
    fontFamily: "FredokaRegular",
    fontSize: 15,
    textAlign: "center",
  },
  darkText: {
    color: "#f8fafc",
  },
  darkMutedText: {
    color: "#cbd5e1",
  },
  videoContainer: {
    position: "relative",
    width: "100%",
    height: 190,
    marginTop: 16,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#503617",
  },
  video: { width: "100%", height: "100%", zIndex: 0, elevation: 0 },
  fullscreenButton: {
    marginTop: 9,
    minHeight: 44,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(80, 54, 23, 0.16)",
  },
  fullscreenButtonText: { color: "#503617", fontFamily: "FredokaBold", fontSize: 15 },
  videoSpinnerModal: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  videoSpinnerBadge: { position: "absolute", width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(24, 18, 12, 0.72)" },
  cancelButton: {
    marginTop: 10,
    minHeight: 38,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(80, 54, 23, 0.16)",
  },
  darkControl: {
    backgroundColor: "rgba(148, 163, 184, 0.18)",
  },
  playerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 14,
  },
  skipButton: {
    minWidth: 82,
    minHeight: 62,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#f4b942",
  },
  skipIcon: { color: "#503617", fontFamily: "FredokaBold", fontSize: 28, lineHeight: 30 },
  skipLabel: { color: "#503617", fontFamily: "FredokaBold", fontSize: 11 },
  mainPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25ad68",
    borderWidth: 3,
    borderColor: "#a7f1c3",
    elevation: 3,
  },
  darkMainPlayButton: { backgroundColor: "#16a36a", borderColor: "#6ee7b7" },
  mainPlayIcon: { color: "#fff", fontFamily: "FredokaBold", fontSize: 30 },
  seekBarHitArea: { width: "100%", paddingTop: 16, paddingBottom: 8 },
  seekTrack: { height: 12, borderRadius: 6, backgroundColor: "#ead8b1", justifyContent: "center" },
  darkSeekTrack: { backgroundColor: "#4b5563" },
  seekFill: { position: "absolute", left: 0, height: 12, borderRadius: 6, backgroundColor: "#25ad68" },
  seekThumb: { position: "absolute", width: 22, height: 22, marginLeft: -11, borderRadius: 11, backgroundColor: "#fff", borderWidth: 3, borderColor: "#25ad68" },
  seekTimes: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  timeText: { color: "#6b4a28", fontFamily: "FredokaMedium", fontSize: 12 },
  darkAdjustButton: {
    backgroundColor: "#374151",
  },
  adjustText: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 14,
  },
  darkAdjustText: {
    color: "#ffffff",
  },
  cancelText: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 14,
  },
  songList: {
    width: "100%",
    maxWidth: 420,
    gap: 10,
    marginTop: 18,
  },
  empty: { textAlign: "center", fontFamily: "FredokaMedium", fontSize: 15, marginHorizontal: 24, marginVertical: 18 },
  playbackError: { color: "#c0392b", fontFamily: "FredokaMedium", fontSize: 14, marginTop: 8, textAlign: "center" },
  loadingNotice: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  loadingText: { color: "#503617", fontFamily: "FredokaMedium", fontSize: 14, flexShrink: 1 },
  songCard: {
    minHeight: 72,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255, 244, 208, 0.94)",
    borderWidth: 3,
    borderColor: "#f4b942",
  },
  darkSongCard: {
    backgroundColor: "#1f2937",
    borderColor: "rgba(148, 163, 184, 0.28)",
  },
  activeSongCard: {
    backgroundColor: "#fff8ed",
    borderColor: "#8a5a1d",
  },
  darkActiveSongCard: {
    backgroundColor: "#374151",
    borderColor: "#fbbf24",
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4b942",
  },
  activePlayButton: {
    backgroundColor: "#8a5a1d",
  },
  darkPlayButton: {
    backgroundColor: "#fbbf24",
  },
  playText: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 15,
  },
  songText: {
    flex: 1,
    marginLeft: 12,
  },
  songTitle: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 16,
  },
  songSubtitle: {
    marginTop: 2,
    color: "#6b4a28",
    fontFamily: "FredokaRegular",
    fontSize: 12,
  },
  duration: {
    color: "#6b4a28",
    fontFamily: "FredokaMedium",
    fontSize: 13,
  },
});
