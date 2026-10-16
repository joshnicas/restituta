import AppText from "../components/app-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { postCompletePractice, postStartPractice, type PracticeCompleteResponse } from "../lib/api";
import type { PracticeRoutePayload } from "../lib/practice-navigation";
import { cacheStartedPractice, recordCompletedPracticeSection, restartFromSession } from "../lib/practice-navigation";
import { useDarkTheme } from "../lib/use-dark-theme";
import { usePracticePressSound } from "../lib/practice-press-sound";

const claimMessages = [
  "Saving your answers…",
  "Adding your stars and points…",
  "Updating your practice record…",
  "Almost there—your progress is on its way!",
];

export default function PracticeResultScreen() {
  const router = useRouter();
  const darkTheme = useDarkTheme();
  const playPressSound = usePracticePressSound();
  const { result: encoded } = useLocalSearchParams<{ result?: string }>();
  const [busy, setBusy] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimMessageIndex, setClaimMessageIndex] = useState(0);
  const claimMessageOpacity = useRef(new Animated.Value(1)).current;
  const [claimed, setClaimed] = useState(false);
  const [savedResult, setSavedResult] = useState<PracticeCompleteResponse | null>(null);
  const [error, setError] = useState("");
  const xpShine = useRef(new Animated.Value(0)).current;
  const starShine = useRef(new Animated.Value(0)).current;
  const payload = useMemo(() => {
    try { return encoded ? JSON.parse(String(encoded)) as PracticeRoutePayload : null; } catch { return null; }
  }, [encoded]);

  useEffect(() => {
    if (!claiming) {
      setClaimMessageIndex(0);
      claimMessageOpacity.setValue(1);
      return;
    }
    const messageTimer = setInterval(() => {
      Animated.timing(claimMessageOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
        if (!finished) return;
        setClaimMessageIndex((index) => (index + 1) % claimMessages.length);
        claimMessageOpacity.setValue(0);
        Animated.timing(claimMessageOpacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
    }, 2300);
    return () => clearInterval(messageTimer);
  }, [claiming, claimMessageOpacity]);

  useEffect(() => {
    if (!payload) return;
    const alreadyClaimed = payload.claimed ?? !payload.pendingAnswers;
    setClaimed(alreadyClaimed);
    setSavedResult(alreadyClaimed ? payload.result ?? null : null);
  }, [payload]);

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

  const shineOverlay = (value: Animated.Value, opacity: number) => ({
    opacity: value.interpolate({ inputRange: [0, 0.45, 0.55, 1], outputRange: [0, opacity, opacity, 0] }),
    transform: [
      { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [-32, 32] }) },
      { rotate: "28deg" as const },
    ],
  });

  const claimProgress = async () => {
    if (!payload || claiming || claimed) return;
    setClaiming(true);
    setError("");
    try {
      const token = await AsyncStorage.getItem("kido.authToken");
      if (!token) throw new Error("Please sign in to continue.");
      const result = await postCompletePractice(payload.session.id, token, payload.pendingAnswers ?? []);
      await recordCompletedPracticeSection(payload.session);
      setSavedResult(result);
      setClaimed(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your progress. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  const again = async () => {
    if (!payload || busy) return;
    setBusy(true); setError("");
    try {
      const token = await AsyncStorage.getItem("kido.authToken");
      if (!token) throw new Error("Please sign in to continue.");
      const started = await postStartPractice(restartFromSession(payload.session), token);
      cacheStartedPractice(started);
      router.replace({ pathname: "/practice-game", params: { sessionId: started.session.id } });
    } catch (reason) {
      const status = Number((reason as { status?: number } | null)?.status);
      if (status === 402) {
        setError("Practice is temporarily unavailable. Please try again.");
      } else {
        setError(reason instanceof Error ? reason.message : "Could not start another practice round.");
      }
    }
    finally { setBusy(false); }
  };

  const result = savedResult ?? payload?.result;
  if (!result) return <SafeAreaView style={[styles.safe, darkTheme && styles.darkSafe]}><AppText style={[styles.title, darkTheme && styles.darkText]}>Practice results</AppText><AppText style={styles.error}>Your results could not be loaded. 🌱</AppText><Pressable onPress={() => { playPressSound(); router.replace("/practice"); }} style={styles.doneButton}><AppText style={styles.doneText}>Done</AppText></Pressable></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.safe, darkTheme && styles.darkSafe]}>
      <View style={[styles.card, darkTheme && styles.darkCard]}>
        <AppText style={[styles.title, darkTheme && styles.darkText]}>Great job!</AppText>
        <AppText style={styles.score}>{result.correctAnswers} / {result.totalQuestions}</AppText>
        <AppText style={[styles.accuracy, darkTheme && styles.darkMutedText]}>{`${result.accuracy}% Accuracy`}</AppText>
        <View style={styles.rewardRow}><View style={styles.iconWrap}><Image source={require("../assets/star.png")} style={styles.icon} resizeMode="contain" /><Animated.View pointerEvents="none" style={[styles.iconShine, shineOverlay(starShine, 0.82)]} /></View><AppText style={[styles.rewardText, darkTheme && styles.darkText]}>+{result.starsEarned} Stars</AppText></View>
        <View style={styles.rewardRow}><View style={styles.iconWrap}><Image source={require("../assets/lightning.png")} style={styles.icon} resizeMode="contain" /><Animated.View pointerEvents="none" style={[styles.iconShine, shineOverlay(xpShine, 0.78)]} /></View><AppText style={[styles.rewardText, darkTheme && styles.darkText]}>+{result.pointsEarned} Points</AppText></View>
        {!claimed ? <Animated.View style={{ opacity: claiming ? claimMessageOpacity : 1 }}><AppText style={styles.claimHint}>{claiming ? claimMessages[claimMessageIndex] : "Save your answers and collect your progress."}</AppText></Animated.View> : null}
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        {!claimed ? (
          <Pressable disabled={claiming} onPress={() => { playPressSound(); void claimProgress(); }} style={[styles.claimButton, claiming && { opacity: 0.65 }]}>
            {claiming ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><ActivityIndicator color="#3d2d12" /><AppText style={styles.claimButtonText}>Saving...</AppText></View> : <AppText style={styles.claimButtonText}>Claim</AppText>}
          </Pressable>
        ) : <>
          <Pressable disabled={busy} onPress={() => { playPressSound(); void again(); }} style={[styles.primary, busy && { opacity: 0.65 }]}>{busy ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><ActivityIndicator color="white" /><AppText style={styles.primaryText}>Starting...</AppText></View> : <AppText style={styles.primaryText}>Practice again</AppText>}</Pressable>
          <Pressable onPress={() => { playPressSound(); router.replace("/practice"); }} style={styles.doneButton}><AppText style={styles.doneText}>Done</AppText></Pressable>
        </>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#8bd6ef", justifyContent: "center", alignItems: "center", padding: 20 }, darkSafe: { backgroundColor: "#111827" }, darkCard: { backgroundColor: "#1f2937", borderColor: "rgba(148,163,184,0.3)" }, darkText: { color: "#f8fafc" }, darkMutedText: { color: "#cbd5e1" }, card: { width: "100%", maxWidth: 440, backgroundColor: "#fff4d0", borderRadius: 30, borderWidth: 3, borderColor: "#f4b942", alignItems: "center", padding: 25, elevation: 4 }, title: { fontFamily: "FredokaBold", fontSize: 29, color: "#4b351f", textTransform: "capitalize", marginTop: 4 }, score: { fontFamily: "FredokaBold", fontSize: 44, color: "#398843", marginTop: 10 }, accuracy: { fontFamily: "FredokaMedium", fontSize: 18, color: "#674e32", marginBottom: 15 }, rewardRow: { flexDirection: "row", alignItems: "center", gap: 9, marginVertical: 4 }, iconWrap: { width: 28, height: 28, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center" }, icon: { width: 25, height: 25 }, iconShine: { position: "absolute", top: -5, left: 0, width: 8, height: 40, backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 8 }, rewardText: { fontFamily: "FredokaBold", fontSize: 19, color: "#503a20" }, claimHint: { fontFamily: "FredokaRegular", color: "#6d593d", fontSize: 14, textAlign: "center", marginTop: 12 }, claimButton: { width: "100%", minHeight: 54, alignItems: "center", justifyContent: "center", marginTop: 16, borderRadius: 18, backgroundColor: "#f2b82d", borderWidth: 2, borderColor: "#dfa21e", shadowColor: "#9a6710", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 3 }, claimButtonText: { fontFamily: "FredokaBold", fontSize: 19, color: "#3d2d12" }, primary: { width: "100%", alignItems: "center", marginTop: 24, paddingVertical: 12, borderRadius: 18, backgroundColor: "#57b957" }, primaryText: { fontFamily: "FredokaBold", fontSize: 18, color: "white", textTransform: "capitalize" }, doneButton: { paddingVertical: 8, marginTop: 8 }, doneText: { fontFamily: "FredokaMedium", fontSize: 15, color: "#624a32" }, error: { fontFamily: "FredokaMedium", color: "#873d31", textAlign: "center", marginTop: 10 } });
