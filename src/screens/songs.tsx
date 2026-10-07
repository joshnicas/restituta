import AppText from "../components/app-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { useFocusEffect, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
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

const songs = [
  { title: "Morning Beat", subtitle: "Start your day", duration: "1:42" },
  { title: "Jungle Jump", subtitle: "Play and explore", duration: "2:08" },
  { title: "Mountain Rhythm", subtitle: "Climb higher", duration: "1:56" },
  { title: "Star Steps", subtitle: "Keep your streak", duration: "2:20" },
];

export default function SongsScreen() {
  const router = useRouter();
  const { musicEnabled, preferencesLoaded } = useAudioPreferences();
  const [activeSong, setActiveSong] = useState<number | null>(null);
  const [isDark, setIsDark] = useState(false);
  const videoPlayer = useVideoPlayer(
    require("../assets/videos/vc052dno2gDideca.mp4"),
    (player) => {
      player.loop = true;
    },
  );
  const stopVideo = useCallback(() => {
    try {
      videoPlayer.pause();
      videoPlayer.currentTime = 0;
    } catch {
      // The player may already be released during route cleanup.
    }
    setActiveSong(null);
  }, [videoPlayer]);

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
          <AppText style={[styles.heroSubtitle, isDark && styles.darkMutedText]}>Choose a rhythm for your next adventure.</AppText>
          {activeSong === 0 && (
            <>
              <VideoView
                player={videoPlayer}
                style={styles.video}
                nativeControls
                contentFit="contain"
              />
              <View style={styles.adjustControls}>
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
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel Morning Beat"
                onPress={stopVideo}
                style={[styles.cancelButton, isDark && styles.darkControl]}
              >
                <AppText style={[styles.cancelText, isDark && styles.darkText]}>Cancel</AppText>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.songList}>
          {songs.map((song, index) => {
            const isActive = activeSong === index;
            return (
              <Pressable
                key={song.title}
                accessibilityRole="button"
                accessibilityLabel={`${isActive ? "Pause" : "Play"} ${song.title}`}
                onPress={() => {
                  if (!preferencesLoaded || !musicEnabled) return;
                  if (index === 0) {
                    if (isActive) {
                      stopVideo();
                    } else {
                      videoPlayer.currentTime = 0;
                      setActiveSong(0);
                      videoPlayer.play();
                    }
                    return;
                  }

                  if (isActive) {
                    setActiveSong(null);
                  } else {
                    stopVideo();
                    setActiveSong(index);
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
                  <AppText style={[styles.playText, isDark && styles.darkText]}>{isActive ? "II" : "▶"}</AppText>
                </View>
                <View style={styles.songText}>
                  <AppText style={[styles.songTitle, isDark && styles.darkText]}>{song.title}</AppText>
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
