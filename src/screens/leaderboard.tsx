import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../components/app-text";
import { getCurrentAuthToken, getLeaderboard, getSchoolByCode, getUserMe, type LeaderboardEntry } from "../lib/api";
import { useDarkTheme } from "../lib/use-dark-theme";

type Period = "overall" | "week" | "month";
type Metric = "xp" | "stars";
type Scope = "everyone" | "school" | "region";

export default function LeaderboardScreen() {
  const router = useRouter();
  const darkTheme = useDarkTheme();
  const [period, setPeriod] = useState<Period>("overall");
  const [metric, setMetric] = useState<Metric>("xp");
  const [scope, setScope] = useState<Scope>("everyone");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myUserId, setMyUserId] = useState("");
  const [mySchoolCode, setMySchoolCode] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [myRegion, setMyRegion] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fontsLoaded] = useFonts({
    FredokaRegular: require("../assets/fonts/Fredoka-Regular.ttf"),
    FredokaMedium: require("../assets/fonts/Fredoka-Medium.ttf"),
    FredokaBold: require("../assets/fonts/Fredoka-Bold.ttf"),
  });

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getLeaderboard({
        period,
        metric,
        page: 1,
        limit: 100,
        ...(scope === "school" && mySchoolCode ? { schoolCode: mySchoolCode } : {}),
        ...(scope === "region" && myRegion ? { region: myRegion } : {}),
      });
      setEntries(Array.isArray(response?.entries) ? response.entries : []);
    } catch {
      setError("Could not load the leaderboard. Please try again.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [metric, myRegion, mySchoolCode, period, scope]);

  useEffect(() => {
    let active = true;
    const loadMyDetails = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("kido.userId");
        if (!storedUserId) return;
        const token = await getCurrentAuthToken();
        if (!token) return;
        const response: any = await getUserMe(String(token));
        const user = response?.user ?? response?.data?.user ?? response?.data ?? response;
        if (!active) return;
        setMyUserId(String(user?.userID ?? storedUserId));
        setMySchoolCode(String(user?.schoolCode ?? ""));
        if (user?.schoolCode) {
          const schoolResponse = await getSchoolByCode(String(user.schoolCode));
          if (active) {
            setSchoolName(String(schoolResponse?.school?.name ?? ""));
            setMyRegion(String(schoolResponse?.school?.region ?? ""));
          }
        }
      } catch {
        // A signed-in player can still browse the all-player leaderboard.
      }
    };
    void loadMyDetails();
    return () => { active = false; };
  }, []);

  useEffect(() => { void loadLeaderboard(); }, [loadLeaderboard]);

  const myEntry = entries.find((entry) => entry.userID === myUserId);
  const chooseScope = (nextScope: Scope) => {
    if (nextScope === "school" && !mySchoolCode) return;
    if (nextScope === "region" && !myRegion) return;
    setScope(nextScope);
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={[styles.safeArea, darkTheme && styles.darkSafeArea]}>
      {!darkTheme && <View style={styles.glow} />}
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.backButton, darkTheme && styles.darkControl]}>
          <AppText style={[styles.backText, darkTheme && styles.darkText]}>‹ Back</AppText>
        </Pressable>
        <AppText style={[styles.title, darkTheme && styles.darkText]}>Leaderboard</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.filtersCard, darkTheme && styles.darkCard]}>
          <AppText style={[styles.filterLabel, darkTheme && styles.darkText]}>Who are you cheering with?</AppText>
          <View style={styles.chipRow}>
            <FilterChip dark={darkTheme} label="Everyone" selected={scope === "everyone"} onPress={() => chooseScope("everyone")} />
            <FilterChip dark={darkTheme} label="My school" selected={scope === "school"} disabled={!mySchoolCode} onPress={() => chooseScope("school")} />
            <FilterChip dark={darkTheme} label={myRegion || "My region"} selected={scope === "region"} disabled={!myRegion} onPress={() => chooseScope("region")} />
          </View>
          {scope === "school" && schoolName ? <AppText style={[styles.schoolLabel, darkTheme && styles.darkMutedText]}>🏫 {schoolName}</AppText> : null}
          {!mySchoolCode ? <AppText style={[styles.helperText, darkTheme && styles.darkMutedText]}>Choose a school in Settings to see your school team.</AppText> : null}

          <AppText style={[styles.filterLabel, styles.secondLabel, darkTheme && styles.darkText]}>When?</AppText>
          <View style={styles.chipRow}>
            <FilterChip dark={darkTheme} label="All time" selected={period === "overall"} onPress={() => setPeriod("overall")} />
            <FilterChip dark={darkTheme} label="This week" selected={period === "week"} onPress={() => setPeriod("week")} />
            <FilterChip dark={darkTheme} label="This month" selected={period === "month"} onPress={() => setPeriod("month")} />
          </View>

          <AppText style={[styles.filterLabel, styles.secondLabel, darkTheme && styles.darkText]}>Count by</AppText>
          <View style={styles.chipRow}>
            <FilterChip dark={darkTheme} label="Stars" icon={require("../assets/star.png")} selected={metric === "stars"} onPress={() => setMetric("stars")} />
            <FilterChip dark={darkTheme} label="XP" icon={require("../assets/lightning.png")} selected={metric === "xp"} onPress={() => setMetric("xp")} />
          </View>
        </View>

        {myEntry ? (
          <View style={[styles.myRankCard, darkTheme && styles.darkCard]}>
            <AppText style={[styles.myRankEyebrow, darkTheme && styles.darkMutedText]}>YOUR PLACE</AppText>
            <AppText style={[styles.myRank, darkTheme && styles.darkText]}>#{myEntry.rank}</AppText>
            <AppText style={[styles.myRankCopy, darkTheme && styles.darkMutedText]}>Keep learning and see if you can move up!</AppText>
          </View>
        ) : null}

        <View style={[styles.listCard, darkTheme && styles.darkCard]}>
          <AppText style={[styles.listTitle, darkTheme && styles.darkText]}>{scope === "everyone" ? "Top learners" : `Top learners · ${scope === "school" ? schoolName || "My school" : myRegion}`}</AppText>
          {loading ? (
            <View style={styles.stateBox}><ActivityIndicator size="large" color="#a86619" /><AppText style={styles.stateText}>Finding the leaderboard…</AppText></View>
          ) : error ? (
            <View style={styles.stateBox}>
              <AppText style={styles.stateText}>{error}</AppText>
              <Pressable onPress={() => void loadLeaderboard()} style={styles.retryButton}><AppText style={styles.retryText}>Try again</AppText></Pressable>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.stateBox}><AppText style={styles.stateText}>No scores yet. Play a game to be the first!</AppText></View>
          ) : entries.map((entry, index) => {
            const isMe = entry.userID === myUserId;
            const displayName = isMe ? "You" : entry.userID;
            const score = metric === "stars" ? entry.stars : entry.xp;
            return (
              <View key={entry.userId} style={[styles.playerRow, darkTheme && styles.darkPlayerRow, isMe && styles.myPlayerRow]}>
                <View style={[styles.rankBadge, index === 0 && styles.firstBadge, index === 1 && styles.secondBadge, index === 2 && styles.thirdBadge]}>
                  <AppText style={styles.rankText}>{entry.rank}</AppText>
                </View>
                <View style={styles.avatar}><AppText style={styles.avatarText}>{isMe ? "😊" : (entry.userID?.[0] ?? "🎮").toUpperCase()}</AppText></View>
                <View style={styles.playerCopy}>
                  <AppText numberOfLines={1} style={[styles.playerName, darkTheme && styles.darkText]}>{displayName}</AppText>
                  {entry.school?.name ? <AppText numberOfLines={1} style={[styles.playerSchool, darkTheme && styles.darkMutedText]}>{entry.school.name}</AppText> : null}
                </View>
                <View style={styles.scoreWrap}>
                  <Image source={metric === "stars" ? require("../assets/star.png") : require("../assets/lightning.png")} style={styles.scoreIcon} resizeMode="contain" />
                  <AppText style={[styles.score, darkTheme && styles.darkText]}>{score.toLocaleString()}</AppText>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({ label, icon, selected, disabled = false, dark = false, onPress }: { label: string; icon?: ImageSourcePropType; selected: boolean; disabled?: boolean; dark?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={[styles.chip, dark && styles.darkControl, selected && styles.selectedChip, disabled && styles.disabledChip]}>
      <View style={styles.chipContent}>
        {icon ? <Image source={icon} style={styles.chipIcon} resizeMode="contain" /> : null}
        <AppText style={[styles.chipText, dark && styles.darkText, selected && styles.selectedChipText, disabled && styles.disabledChipText]}>{label}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8c25a" },
  darkSafeArea: { backgroundColor: "#111827" },
  darkCard: { backgroundColor: "#1f2937", borderColor: "rgba(148,163,184,0.3)" },
  darkControl: { backgroundColor: "#374151", borderColor: "#4b5563" },
  darkText: { color: "#f8fafc" },
  darkMutedText: { color: "#cbd5e1" },
  darkPlayerRow: { borderTopColor: "rgba(203,213,225,0.16)" },
  glow: { position: "absolute", top: -110, right: -90, width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(255,247,211,0.45)" },
  header: { minHeight: 62, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { minHeight: 40, paddingHorizontal: 12, justifyContent: "center", borderRadius: 14, backgroundColor: "rgba(80,54,23,0.15)" },
  backText: { color: "#503617", fontFamily: "FredokaBold", fontSize: 15 },
  title: { color: "#503617", fontFamily: "FredokaBold", fontSize: 24 },
  headerSpacer: { width: 62 },
  content: { width: "100%", maxWidth: 520, alignSelf: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 14 },
  filtersCard: { padding: 16, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.72)", borderWidth: 2, borderColor: "rgba(80,54,23,0.12)" },
  filterLabel: { color: "#503617", fontFamily: "FredokaBold", fontSize: 15, marginBottom: 8 },
  secondLabel: { marginTop: 14 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 16, justifyContent: "center", borderRadius: 15, backgroundColor: "#fff4d0", borderWidth: 2, borderColor: "#e6b95b" },
  chipContent: { flexDirection: "row", alignItems: "center", gap: 6 },
  chipIcon: { width: 21, height: 21 },
  selectedChip: { backgroundColor: "#f4b942", borderColor: "#d99726" },
  disabledChip: { opacity: 0.48 },
  chipText: { color: "#6b4a28", fontFamily: "FredokaMedium", fontSize: 14 },
  selectedChipText: { color: "#503617", fontFamily: "FredokaBold" },
  disabledChipText: { color: "#826f55" },
  helperText: { color: "#755a37", fontFamily: "FredokaRegular", fontSize: 12, marginTop: 8 },
  schoolLabel: { color: "#6b4a28", fontFamily: "FredokaBold", fontSize: 13, marginTop: 8 },
  myRankCard: { alignItems: "center", paddingVertical: 16, borderRadius: 22, backgroundColor: "#fff4d0", borderWidth: 3, borderColor: "#f4b942" },
  myRankEyebrow: { color: "#8a5a1d", fontFamily: "FredokaBold", fontSize: 12, letterSpacing: 1 },
  myRank: { color: "#503617", fontFamily: "FredokaBold", fontSize: 42, lineHeight: 48 },
  myRankCopy: { color: "#6b4a28", fontFamily: "FredokaRegular", fontSize: 13 },
  listCard: { padding: 16, borderRadius: 22, backgroundColor: "rgba(255,244,208,0.96)", borderWidth: 2, borderColor: "#f4b942" },
  listTitle: { color: "#503617", fontFamily: "FredokaBold", fontSize: 20, marginBottom: 6 },
  playerRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 9, borderTopWidth: 1, borderTopColor: "rgba(80,54,23,0.12)", paddingHorizontal: 3 },
  myPlayerRow: { backgroundColor: "rgba(244,185,66,0.24)", borderRadius: 12 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#ead8b1" },
  firstBadge: { backgroundColor: "#ffd957" },
  secondBadge: { backgroundColor: "#d8e4e8" },
  thirdBadge: { backgroundColor: "#e8b585" },
  rankText: { color: "#503617", fontFamily: "FredokaBold", fontSize: 13 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#f4b942" },
  avatarText: { color: "#503617", fontFamily: "FredokaBold", fontSize: 15 },
  playerCopy: { flex: 1, minWidth: 0 },
  playerName: { color: "#503617", fontFamily: "FredokaBold", fontSize: 15 },
  playerSchool: { color: "#82613a", fontFamily: "FredokaRegular", fontSize: 11, marginTop: 1 },
  scoreWrap: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 68, justifyContent: "flex-end" },
  scoreIcon: { width: 22, height: 22 },
  score: { color: "#6b4a28", fontFamily: "FredokaBold", fontSize: 14 },
  stateBox: { minHeight: 96, alignItems: "center", justifyContent: "center", padding: 12, gap: 10 },
  stateText: { color: "#6b4a28", fontFamily: "FredokaMedium", fontSize: 14, textAlign: "center" },
  retryButton: { minHeight: 38, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#f4b942" },
  retryText: { color: "#503617", fontFamily: "FredokaBold", fontSize: 14 },
});
