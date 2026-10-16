import AppText from "../components/app-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { useFocusEffect, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { ActivityIndicator } from "react-native";
import { useCallback, useEffect, useState } from "react";
import {
    AppState,
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
  const [isDark, setIsDark] = useState(false);
  const videoPlayer = useVideoPlayer(null, (player) => {
    player.loop = false;
  });
  const audioPlayer = useAudioPlayer(null);
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  useEffect(() => {
    const subscription = videoPlayer.addListener("statusChange", ({ status }) => {
      if (status === "loading") setVideoBuffering(true);
      if (status === "readyToPlay") setVideoBuffering(false);
      if (status === "error") {
        setVideoBuffering(false);
        setPlaybackError(true);
      }
    });
    return () => subscription.remove();
  }, [videoPlayer]);
  const selectedSong = songs.find((song) => song.id === activeSong);
  const playbackLoading = selectedSong?.mediaType === "VIDEO"
    ? videoBuffering
    : selectedSong?.mediaType === "AUDIO" && (!audioStatus.isLoaded || audioStatus.isBuffering);
  const stopVideo = useCallback(() => {
    try {
      videoPlayer.pause();
      videoPlayer.currentTime = 0;
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
        videoPlayer.play();
      }
      setActiveSong(song.id);
    } catch {
      setPlaybackError(true);
      setActiveSong(null);
    }
  }, [audioPlayer, videoPlayer]);

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
      >
        <View style={[styles.heroCard, isDark && styles.darkCard]}>
          <AppText style={[styles.heroTitle, isDark && styles.darkText]}>Play a song</AppText>
          <AppText style={[styles.heroSubtitle, isDark && styles.darkMutedText]}>{activeSong !== null ? songs.find((song) => song.id === activeSong)?.title : "Choose a rhythm for your next adventure."}</AppText>
          {activeSong !== null && (
            <>
              {songs.find((song) => song.id === activeSong)?.mediaType === "VIDEO" ? <VideoView
                player={videoPlayer}
                style={styles.video}
                nativeControls
                contentFit="contain"
              /> : null}
              {playbackLoading ? <View style={styles.loadingNotice} accessibilityLiveRegion="polite">
                <ActivityIndicator color={isDark ? "#fbbf24" : "#8a5a1d"} />
                <AppText style={[styles.loadingText, isDark && styles.darkMutedText]}>
                  Getting {selectedSong?.title} ready. This may take a moment…
                </AppText>
              </View> : null}
              {songs.find((song) => song.id === activeSong)?.mediaType === "VIDEO" ? <View style={styles.adjustControls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Rewind 10 seconds"
                  onPress={() => videoPlayer.seekBy(-10)}
                  style={[styles.adjustButton, isDark && styles.darkAdjustButton]}
                >
                  <AppText style={[styles.adjustText, isDark && styles.darkAdjustText]}>
                    -10s
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Forward 10 seconds"
                  onPress={() => videoPlayer.seekBy(10)}
                  style={[styles.adjustButton, isDark && styles.darkAdjustButton]}
                >
                  <AppText style={[styles.adjustText, isDark && styles.darkAdjustText]}>
                    +10s
                  </AppText>
                </Pressable>
              </View> : null}
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
                accessibilityLabel={`${isActive ? "Pause" : "Play"} ${song.title}`}
                onPress={() => {
                  if (!preferencesLoaded) return;
                  if (isActive) {
                    stopVideo();
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
                  {isActive && playbackLoading ? <ActivityIndicator color={isDark ? "#263044" : "#fff"} /> : <AppText style={[styles.playText, isDark && styles.darkText]}>{isActive ? "II" : "▶"}</AppText>}
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
    </SafeAreaView>
  );
}

function mediaUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
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
  video: {
    width: "100%",
    height: 190,
    marginTop: 16,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#503617",
  },
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
  adjustControls: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  adjustButton: {
    minWidth: 68,
    minHeight: 36,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#f4b942",
  },
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
