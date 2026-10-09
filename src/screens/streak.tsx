import AppText from "../components/app-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMyStreak, type UserStreakResponse } from "../lib/api";
import { getPlayLandErrorMessage } from "../lib/network-errors";

const getStreakMessage = (currentStreak: number) => {
  if (currentStreak === 0) return "Complete a learning activity to start your streak!";
  if (currentStreak === 1) return "Great start. Come back tomorrow to keep it going!";
  if (currentStreak >= 10) return "Amazing streak!";
  return "Keep going. You are on fire!";
};

const getTodayDateKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export default function StreakScreen() {
  const router = useRouter();
  const [showMoreStreaks, setShowMoreStreaks] = useState(false);
  const [streakData, setStreakData] = useState<UserStreakResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkTheme, setDarkTheme] = useState(false);
  const todayDateKey = getTodayDateKey();
  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);
  const [fontsLoaded] = useFonts({
    FredokaRegular: require("../assets/fonts/Fredoka-Regular.ttf"),
    FredokaMedium: require("../assets/fonts/Fredoka-Medium.ttf"),
    FredokaBold: require("../assets/fonts/Fredoka-Bold.ttf"),
  });

  const loadStreak = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem("kido.authToken");
      if (!token) {
        throw new Error("Sign in to view your streak.");
      }

      const response = await getMyStreak(token);
      if (response.success !== true) {
        throw new Error("Couldn't load your streak.");
      }

      if (requestId === requestIdRef.current) {
        setStreakData(response);
      }
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        const status =
          loadError && typeof loadError === "object" && "status" in loadError
            ? loadError.status
            : undefined;
        const fallback = status === 404
          ? "The streak service isn't available on this server yet."
          : "Couldn't load your streak.";
        setError(getPlayLandErrorMessage(loadError, fallback));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void AsyncStorage.getItem("kido.theme")
        .then((theme) => setDarkTheme(theme === "dark"))
        .catch(() => setDarkTheme(false));
      void loadStreak();
      return () => {
        requestIdRef.current += 1;
        loadingRef.current = false;
      };
    }, [loadStreak]),
  );

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.safeArea, darkTheme && styles.darkSafeArea]}>
      {!darkTheme && <View style={styles.backgroundGlow} />}
      {!darkTheme && <View style={styles.backgroundGlowTwo} />}

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.backButton, darkTheme && styles.darkButton]}
        >
          <AppText style={[styles.backText, darkTheme && styles.darkText]}>Back</AppText>
        </Pressable>
        <AppText style={[styles.title, darkTheme && styles.darkText]}>Streak</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={[styles.statusContainer, darkTheme && styles.darkCard]}>
            <ActivityIndicator color={darkTheme ? "#fbbf24" : "#503617"} />
            <AppText style={[styles.statusText, darkTheme && styles.darkText]}>Loading streak...</AppText>
          </View>
        ) : error ? (
          <View style={[styles.statusContainer, darkTheme && styles.darkCard]}>
            <AppText style={[styles.errorText, darkTheme && styles.darkText]}>{error}</AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadStreak()}
              style={[styles.retryButton, darkTheme && styles.darkButton]}
            >
              <AppText style={[styles.retryText, darkTheme && styles.darkText]}>Try again</AppText>
            </Pressable>
          </View>
        ) : streakData ? (
          <>
            <View style={[styles.heroCard, darkTheme && styles.darkCard]}>
              <AppText style={[styles.heroEyebrow, darkTheme && styles.darkMutedText]}>CURRENT STREAK</AppText>
              <AppText
                style={[styles.streakValue, darkTheme && styles.darkText]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {streakData.currentStreak}
              </AppText>
              <AppText style={[styles.daysLabel, darkTheme && styles.darkMutedText]}>days in a row</AppText>
              <AppText style={[styles.message, darkTheme && styles.darkText]}>
                {getStreakMessage(streakData.currentStreak)}
              </AppText>
            </View>

            <View style={[styles.weekCard, darkTheme && styles.darkCard]}>
              <AppText style={[styles.sectionTitle, darkTheme && styles.darkText]}>This week</AppText>
              <View style={styles.weekRow}>
                {streakData.week.map((item) => {
                  const missed = !item.complete && item.date < todayDateKey;
                  return (
                    <View key={item.date} style={styles.dayColumn}>
                    <View
                      style={[
                        styles.dayDot,
                        item.complete && styles.completedDot,
                        missed && styles.missedDot,
                      ]}
                    >
                      {item.complete && (
                        <Image
                          source={require("../assets/correct2.png")}
                          style={styles.check}
                          resizeMode="contain"
                        />
                      )}
                      {missed && <AppText style={styles.missedCross}>×</AppText>}
                    </View>
                    <AppText style={[styles.dayLabel, darkTheme && styles.darkMutedText]}>{item.day}</AppText>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={[styles.leaderboardCard, darkTheme && styles.darkCard]}>
              <AppText style={[styles.sectionTitle, darkTheme && styles.darkText]}>Your longest streaks</AppText>
              <AppText style={[styles.bestStreak, darkTheme && styles.darkMutedText]}>
                Best: {streakData.longestStreak} days
              </AppText>
              {streakData.historicalStreaks.length > 0 ? (
                <>
                  {streakData.historicalStreaks.slice(0, 5).map((run, index) => (
                    <View
                      key={`${run.startDate}-${run.endDate}`}
                      style={styles.streakRow}
                    >
                      <AppText style={[styles.rank, darkTheme && styles.darkMutedText]}>{index + 1}</AppText>
                      <AppText style={[styles.streakName, darkTheme && styles.darkText]}>Run {index + 1}</AppText>
                      <AppText style={[styles.streakDays, darkTheme && styles.darkMutedText]}>{run.days} days</AppText>
                    </View>
                  ))}

                  {streakData.historicalStreaks.length > 5 && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setShowMoreStreaks((visible) => !visible)}
                      style={[styles.seeMoreButton, darkTheme && styles.darkButton]}
                    >
                      <AppText style={[styles.seeMoreText, darkTheme && styles.darkText]}>
                        {showMoreStreaks ? "Show less" : "See more streaks"}
                      </AppText>
                    </Pressable>
                  )}

                  {showMoreStreaks && (
                    <View style={styles.additionalStreaks}>
                      {streakData.historicalStreaks
                        .slice(5)
                        .map((run, index) => (
                          <View
                            key={`${run.startDate}-${run.endDate}`}
                            style={styles.streakRow}
                          >
                            <AppText style={[styles.rank, darkTheme && styles.darkMutedText]}>{index + 6}</AppText>
                            <AppText style={[styles.streakName, darkTheme && styles.darkText]}>
                              Run {index + 6}
                            </AppText>
                            <AppText style={[styles.streakDays, darkTheme && styles.darkMutedText]}>
                              {run.days} days
                            </AppText>
                          </View>
                        ))}
                    </View>
                  )}
                </>
              ) : (
                <AppText style={[styles.emptyHistory, darkTheme && styles.darkMutedText]}>
                  No completed streak runs yet.
                </AppText>
              )}
            </View>
          </>
        ) : null}
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
  darkCard: {
    backgroundColor: "#1f2937",
    borderColor: "rgba(148, 163, 184, 0.28)",
    shadowColor: "#000",
  },
  darkText: {
    color: "#f8fafc",
  },
  darkMutedText: {
    color: "#cbd5e1",
  },
  darkButton: {
    backgroundColor: "#374151",
  },
  darkDayDot: {
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    borderColor: "rgba(203, 213, 225, 0.28)",
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
  statusContainer: {
    width: "100%",
    maxWidth: 420,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    borderRadius: 24,
    backgroundColor: "rgba(255, 244, 208, 0.94)",
    borderWidth: 3,
    borderColor: "#f4b942",
  },
  statusText: {
    color: "#503617",
    fontFamily: "FredokaMedium",
    fontSize: 16,
  },
  errorText: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 17,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#f4b942",
  },
  retryText: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 15,
  },
  heroCard: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    paddingVertical: 32,
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
  heroEyebrow: {
    color: "#8a5a1d",
    fontFamily: "FredokaBold",
    fontSize: 13,
    letterSpacing: 1,
  },
  streakValue: {
    marginTop: 4,
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 76,
    lineHeight: 82,
  },
  daysLabel: {
    color: "#6b4a28",
    fontFamily: "FredokaMedium",
    fontSize: 18,
  },
  message: {
    marginTop: 18,
    color: "#503617",
    fontFamily: "FredokaRegular",
    fontSize: 16,
  },
  weekCard: {
    width: "100%",
    maxWidth: 420,
    marginTop: 18,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderWidth: 2,
    borderColor: "rgba(80, 54, 23, 0.14)",
  },
  sectionTitle: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 20,
    marginBottom: 16,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayColumn: {
    alignItems: "center",
    gap: 7,
  },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(80, 54, 23, 0.12)",
    borderWidth: 2,
    borderColor: "rgba(80, 54, 23, 0.18)",
  },
  completedDot: {
    backgroundColor: "#f4b942",
    borderColor: "#fff4d0",
  },
  missedDot: {
    backgroundColor: "#FCE3E3",
    borderColor: "#E5A2A2",
  },
  missedCross: {
    color: "#C93636",
    fontFamily: "FredokaBold",
    fontSize: 25,
    lineHeight: 27,
    marginTop: -2,
  },
  check: {
    width: 22,
    height: 22,
  },
  dayLabel: {
    color: "#6b4a28",
    fontFamily: "FredokaBold",
    fontSize: 13,
  },
  leaderboardCard: {
    width: "100%",
    maxWidth: 420,
    marginTop: 18,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "rgba(255, 244, 208, 0.94)",
    borderWidth: 3,
    borderColor: "#f4b942",
    shadowColor: "#5b3218",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  bestStreak: {
    marginTop: -8,
    marginBottom: 12,
    color: "#6b4a28",
    fontFamily: "FredokaMedium",
    fontSize: 15,
  },
  emptyHistory: {
    color: "#6b4a28",
    fontFamily: "FredokaRegular",
    fontSize: 15,
  },
  streakRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(80, 54, 23, 0.12)",
  },
  rank: {
    width: 28,
    color: "#8a5a1d",
    fontFamily: "FredokaBold",
    fontSize: 15,
  },
  streakName: {
    flex: 1,
    color: "#503617",
    fontFamily: "FredokaMedium",
    fontSize: 15,
  },
  streakDays: {
    color: "#6b4a28",
    fontFamily: "FredokaBold",
    fontSize: 14,
  },
  seeMoreButton: {
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: "#f4b942",
  },
  seeMoreText: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 14,
  },
  additionalStreaks: {
    marginTop: 4,
  },
});
