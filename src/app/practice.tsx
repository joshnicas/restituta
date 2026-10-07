import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../components/app-text";
import { getPracticeHome, postStartPractice, type PracticeHomeResponse, type PracticeStartInput } from "../lib/api";
import { getPracticeErrorMessage } from "../lib/practice-errors";
import { useDarkTheme } from "../lib/use-dark-theme";

export default function PracticeHomeScreen() {
  const router = useRouter();
  const darkTheme = useDarkTheme();
  const [data, setData] = useState<PracticeHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const xpShine = useRef(new Animated.Value(0)).current;
  const starShine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createShine = (value: Animated.Value, delay: number) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 1, useNativeDriver: true }),
      Animated.delay(1900),
    ]));
    const xpAnimation = createShine(xpShine, 350);
    const starAnimation = createShine(starShine, 1050);
    xpAnimation.start();
    starAnimation.start();
    return () => { xpAnimation.stop(); starAnimation.stop(); };
  }, [starShine, xpShine]);

  const renderRewardIcon = (kind: "xp" | "star", size: number) => {
    const shine = kind === "xp" ? xpShine : starShine;
    const source = kind === "xp" ? require("../assets/lightning.png") : require("../assets/star.png");
    const opacity = kind === "xp" ? 0.78 : 0.82;
    return (
      <View style={[styles.rewardIconWrap, { width: size, height: size }]}>
        <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />
        <Animated.View pointerEvents="none" style={[styles.iconShine, {
          opacity: shine.interpolate({ inputRange: [0, 0.45, 0.55, 1], outputRange: [0, opacity, opacity, 0] }),
          transform: [
            { translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-size * 1.15, size * 1.15] }) },
            { rotate: "28deg" },
          ],
        }]} />
      </View>
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await AsyncStorage.getItem("kido.authToken");
      if (!token) throw new Error("Please sign in to use Practice.");
      setData(await getPracticeHome(token));
    } catch (reason) {
      setError(getPracticeErrorMessage(reason, "Could not load Practice. Please try again."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const start = async (body: PracticeStartInput) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const token = await AsyncStorage.getItem("kido.authToken");
      if (!token) throw new Error("Please sign in to use Practice.");
      const started = await postStartPractice(body, token);
      router.push({ pathname: "/practice-game", params: { sessionId: started.session.id } });
    } catch (reason) {
      const status = Number((reason as { status?: number } | null)?.status);
      setError(status === 401
        ? "Please sign in to use Practice."
        : status === 404
          ? "No questions are ready for practice yet. Try another subject or come back later."
          : "We couldn't start Practice right now. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, darkTheme && styles.darkSafe]}>
      {!darkTheme && <View style={styles.backgroundGlow} />}
      {!darkTheme && <View style={styles.backgroundGlowTwo} />}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.back, darkTheme && styles.darkSurface]}><AppText style={[styles.backText, darkTheme && styles.darkText]}>‹ Back</AppText></Pressable>
          <AppText style={[styles.title, darkTheme && styles.darkText]}>Practice</AppText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.heroCard, darkTheme && styles.darkCard]}>
          <View style={[styles.heroPill, darkTheme && styles.darkSurface]}><AppText style={[styles.heroPillText, darkTheme && styles.darkMutedText]}>Daily boost</AppText></View>
          <AppText style={[styles.heroTitle, darkTheme && styles.darkText]}>Keep your streak going</AppText>
          <AppText style={[styles.heroSubtitle, darkTheme && styles.darkMutedText]}>Warm up with a few questions and build confidence one lesson at a time.</AppText>
        </View>

        {error ? <View style={[styles.errorCard, darkTheme && styles.darkCard]}><AppText style={styles.errorText}>{error}</AppText><Pressable onPress={() => void load()}><AppText style={styles.retry}>Try again</AppText></Pressable></View> : null}
        {loading ? <ActivityIndicator color="#f6b943" size="large" style={styles.loader} /> : (
          <>
            <View style={[styles.primaryCard, darkTheme && styles.darkCard]}>
              <View style={styles.cardTitleRow}>{renderRewardIcon("xp", 31)}<AppText style={[styles.cardTitle, darkTheme && styles.darkText]}>Quick Practice</AppText></View>
              <AppText style={[styles.cardDescription, darkTheme && styles.darkMutedText]}>{data?.quickPractice.questionCount ?? 5} questions</AppText>
              <AppText style={[styles.cardHint, darkTheme && styles.darkMutedText]}>Mixed topics</AppText>
              <AppText style={[styles.cardHint, darkTheme && styles.darkMutedText]}>Earn points & stars</AppText>
              {!data?.quickPractice.available ? <AppText style={styles.emptyHint}>No questions yet! Try another subject or come back later.</AppText> : null}
              <Pressable disabled={busy || !data?.quickPractice.available} onPress={() => void start({ mode: "QUICK" })} style={[styles.primaryButton, (busy || !data?.quickPractice.available) && styles.disabled]}>
                <AppText style={styles.buttonText}>{busy ? "Starting..." : "Start"}</AppText>
              </Pressable>
            </View>

            <View style={[styles.mistakeCard, darkTheme && styles.darkCard]}>
              <View style={styles.cardTitleRow}><AppText style={styles.mistakeEmoji}>💪</AppText><AppText style={[styles.sectionTitle, darkTheme && styles.darkText]}>Practice your weaker topics</AppText></View>
              <AppText style={[styles.description, darkTheme && styles.darkMutedText]}>{data?.mistakes.topic
                ? `${data.mistakes.topic.name} · ${data.mistakes.topic.accuracy}% accuracy · ${data.mistakes.questionCount} new questions`
                : data?.mistakes.hasWeakTopics
                  ? "You're improving! There are no new questions in your weaker topics right now."
                  : "We couldn’t find new questions for weaker topics yet. Answer 3 or more questions in a topic, including at least 1 wrong answer, to unlock practice."}</AppText>
              {Boolean(data?.mistakes.questionCount) && <Pressable disabled={busy} onPress={() => void start({ mode: "MISTAKES" })} style={styles.secondaryButton}><AppText style={styles.secondaryButtonText}>Practice</AppText></Pressable>}
            </View>

            <AppText style={[styles.sectionHeading, darkTheme && styles.darkText]}>Practice by subject</AppText>
            {data?.subjects.length ? data.subjects.map((subject) => (
              <Pressable key={subject.id} onPress={() => router.push({ pathname: "/practice-subject", params: { subjectId: subject.id } })} style={[styles.subjectCard, darkTheme && styles.darkCard]}>
                <View style={[styles.subjectIconWrap, darkTheme && styles.darkSurface]}><AppText style={styles.subjectIcon}>📚</AppText></View>
                <View style={styles.subjectText}><AppText style={[styles.subjectName, darkTheme && styles.darkText]}>{subject.name}</AppText><AppText style={[styles.subjectMeta, darkTheme && styles.darkMutedText]}>{subject.accuracy === null ? "Keep practicing to see accuracy" : `${subject.accuracy}% accuracy`}</AppText></View>
                <AppText style={styles.chevron}>›</AppText>
              </Pressable>
            )) : <View style={styles.emptyCard}><AppText style={styles.description}>No subjects are ready yet. Check back soon!</AppText></View>}

            <AppText style={[styles.sectionHeading, darkTheme && styles.darkText]}>Your practice</AppText>
            <View style={[styles.statsCard, darkTheme && styles.darkCard]}>
              <View style={styles.statsGrid}>
                <Stat dark={darkTheme} label="Questions practiced" value={data?.stats.questionsAnswered ?? 0} />
                <Stat dark={darkTheme} label="Accuracy" value={data?.stats.accuracy === null || data?.stats.accuracy === undefined ? "—" : `${data.stats.accuracy}%`} />
                <Stat dark={darkTheme} label="Points earned" value={data?.stats.pointsEarned ?? 0} icon="xp" shine={xpShine} />
                <Stat dark={darkTheme} label="Stars earned" value={data?.stats.starsEarned ?? 0} icon="star" shine={starShine} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, icon, shine, dark = false }: { label: string; value: string | number; icon?: "xp" | "star"; shine?: Animated.Value; dark?: boolean }) {
  return <View style={styles.stat}><View style={[styles.statTextWrap, dark && styles.darkSurface]}><AppText style={[styles.statLabel, dark && styles.darkMutedText]}>{label}</AppText><View style={styles.statValueRow}>{icon && shine ? <View style={styles.statIconWrap}><Image source={icon === "xp" ? require("../assets/lightning.png") : require("../assets/star.png")} style={styles.statIcon} resizeMode="contain" /><Animated.View pointerEvents="none" style={[styles.iconShine, { opacity: shine.interpolate({ inputRange: [0, 0.45, 0.55, 1], outputRange: [0, icon === "xp" ? 0.78 : 0.82, icon === "xp" ? 0.78 : 0.82, 0] }), transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-21, 21] }) }, { rotate: "28deg" }] }]} /></View> : null}<AppText style={[styles.statValue, dark && styles.darkText]}>{value}</AppText></View></View></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8c25a" },
  darkSafe: { backgroundColor: "#111827" }, darkCard: { backgroundColor: "#1f2937", borderColor: "rgba(148,163,184,0.3)" }, darkSurface: { backgroundColor: "#374151", borderColor: "#4b5563" }, darkText: { color: "#f8fafc" }, darkMutedText: { color: "#cbd5e1" },
  backgroundGlow: { position: "absolute", top: -110, right: -90, width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(255,247,211,0.45)" },
  backgroundGlowTwo: { position: "absolute", bottom: 60, left: -120, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(255,235,176,0.24)" },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 130, maxWidth: 520, width: "100%", alignSelf: "center", gap: 14 },
  headerRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 1 },
  back: { minHeight: 40, paddingHorizontal: 12, justifyContent: "center", borderRadius: 14, backgroundColor: "rgba(80,54,23,0.15)" },
  backText: { fontFamily: "FredokaBold", fontSize: 15, color: "#503617" },
  title: { fontFamily: "FredokaBold", fontSize: 24, color: "#503617" },
  headerSpacer: { width: 62 },
  heroCard: { backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 22, borderWidth: 2, borderColor: "rgba(80,54,23,0.12)", padding: 16, marginBottom: 0 },
  heroPill: { alignSelf: "flex-start", backgroundColor: "#fff4d0", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#e6b95b" },
  heroPillText: { fontFamily: "FredokaBold", fontSize: 11, color: "#8a5a1d", textTransform: "uppercase", letterSpacing: 0.6 },
  heroTitle: { fontFamily: "FredokaBold", fontSize: 22, color: "#503617", marginTop: 10 },
  heroSubtitle: { fontFamily: "FredokaRegular", fontSize: 14, color: "#6b4a28", marginTop: 4, lineHeight: 20 },
  primaryCard: { borderRadius: 22, backgroundColor: "#fff4d0", padding: 16, borderWidth: 2, borderColor: "#e6b95b", marginBottom: 0 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  rewardIconWrap: { overflow: "hidden", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  iconShine: { position: "absolute", top: -5, left: 0, width: 8, height: 40, backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 8 },
  cardTitle: { fontFamily: "FredokaBold", fontSize: 21, color: "#503617", textTransform: "capitalize" },
  cardDescription: { fontFamily: "FredokaMedium", fontSize: 16, color: "#624a32", marginTop: 10 },
  cardHint: { fontFamily: "FredokaRegular", fontSize: 14, color: "#755a37", marginTop: 2 },
  emptyHint: { fontFamily: "FredokaMedium", fontSize: 14, color: "#873d31", marginTop: 8 },
  primaryButton: { alignSelf: "flex-start", paddingHorizontal: 28, paddingVertical: 10, borderRadius: 15, marginTop: 16, backgroundColor: "#57b957" },
  buttonText: { fontFamily: "FredokaBold", fontSize: 18, color: "white", textTransform: "uppercase" },
  disabled: { opacity: 0.6 },
  mistakeCard: { borderRadius: 22, backgroundColor: "rgba(255,255,255,0.72)", padding: 16, borderWidth: 2, borderColor: "rgba(80,54,23,0.12)", marginBottom: 0 },
  mistakeEmoji: { fontSize: 24 },
  sectionTitle: { fontFamily: "FredokaBold", fontSize: 18, color: "#503617", textTransform: "capitalize" },
  description: { fontFamily: "FredokaRegular", fontSize: 14, color: "#6b4a28", marginTop: 6, lineHeight: 20 },
  secondaryButton: { alignSelf: "flex-start", marginTop: 14, borderRadius: 15, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: "#f4b942" },
  secondaryButtonText: { fontFamily: "FredokaBold", fontSize: 15, color: "#503617", textTransform: "uppercase" },
  sectionHeading: { fontFamily: "FredokaBold", fontSize: 20, color: "#503617", marginBottom: 0, textTransform: "capitalize" },
  subjectCard: { backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 17, paddingHorizontal: 13, paddingVertical: 11, flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "rgba(80,54,23,0.12)", marginBottom: 0 },
  subjectIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#fff4d0", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e6b95b", marginRight: 10 },
  subjectIcon: { fontSize: 24, textAlign: "center" },
  subjectText: { flex: 1 },
  subjectName: { fontFamily: "FredokaBold", fontSize: 16, color: "#503617" },
  subjectMeta: { fontFamily: "FredokaRegular", fontSize: 13, color: "#755a37", marginTop: 2 },
  chevron: { fontSize: 30, color: "#98743d" },
  emptyCard: { backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: "rgba(80,54,23,0.12)" },
  statsCard: { backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 22, padding: 12, borderWidth: 2, borderColor: "rgba(80,54,23,0.12)" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap" },
  stat: { width: "50%", padding: 8 },
  statTextWrap: { backgroundColor: "#fff4d0", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#f1d592" },
  statLabel: { fontFamily: "FredokaMedium", fontSize: 13, color: "#6b4a28" },
  statValueRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  statIconWrap: { width: 18, height: 18, overflow: "hidden", borderRadius: 5, alignItems: "center", justifyContent: "center" },
  statIcon: { width: 18, height: 18 },
  statValue: { fontFamily: "FredokaBold", fontSize: 18, color: "#503617" },
  loader: { marginTop: 60 },
  errorCard: { backgroundColor: "#fff1ef", borderRadius: 18, padding: 14, borderColor: "#e7998d", borderWidth: 1 },
  errorText: { fontFamily: "FredokaMedium", fontSize: 15, color: "#873d31" },
  retry: { fontFamily: "FredokaBold", fontSize: 15, color: "#7245a1", marginTop: 8, textTransform: "capitalize" },
});
