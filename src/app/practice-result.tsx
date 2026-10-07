import AppText from "../components/app-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { postStartPractice } from "../lib/api";
import type { PracticeRoutePayload } from "../lib/practice-navigation";
import { restartFromSession } from "../lib/practice-navigation";
import { useDarkTheme } from "../lib/use-dark-theme";

export default function PracticeResultScreen() {
  const router = useRouter();
  const darkTheme = useDarkTheme();
  const { result: encoded } = useLocalSearchParams<{ result?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const xpShine = useRef(new Animated.Value(0)).current;
  const starShine = useRef(new Animated.Value(0)).current;
  const payload = useMemo(() => {
    try { return encoded ? JSON.parse(String(encoded)) as PracticeRoutePayload : null; } catch { return null; }
  }, [encoded]);

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

  const again = async () => {
    if (!payload || busy) return;
    setBusy(true); setError("");
    try {
      const token = await AsyncStorage.getItem("kido.authToken");
      if (!token) throw new Error("Please sign in to continue.");
      const started = await postStartPractice(restartFromSession(payload.session), token);
      router.replace({ pathname: "/practice-game", params: { sessionId: started.session.id } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start another practice round."); }
    finally { setBusy(false); }
  };

  const result = payload?.result;
  if (!result) return <SafeAreaView style={[styles.safe, darkTheme && styles.darkSafe]}><AppText style={[styles.title, darkTheme && styles.darkText]}>Practice results</AppText><AppText style={styles.error}>Your results could not be loaded. 🌱</AppText><Pressable onPress={() => router.replace("/practice")} style={styles.secondary}><AppText style={styles.secondaryText}>Done</AppText></Pressable></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.safe, darkTheme && styles.darkSafe]}>
      <View style={[styles.card, darkTheme && styles.darkCard]}>
        <AppText style={[styles.title, darkTheme && styles.darkText]}>Great job!</AppText>
        <AppText style={styles.score}>{result.correctAnswers} / {result.totalQuestions}</AppText>
        <AppText style={[styles.accuracy, darkTheme && styles.darkMutedText]}>{result.accuracy}% Accuracy</AppText>
        <View style={styles.rewardRow}><View style={styles.iconWrap}><Image source={require("../assets/star.png")} style={styles.icon} resizeMode="contain" /><Animated.View pointerEvents="none" style={[styles.iconShine, shineOverlay(starShine, 0.82)]} /></View><AppText style={[styles.rewardText, darkTheme && styles.darkText]}>+{result.starsEarned} Stars</AppText></View>
        <View style={styles.rewardRow}><View style={styles.iconWrap}><Image source={require("../assets/lightning.png")} style={styles.icon} resizeMode="contain" /><Animated.View pointerEvents="none" style={[styles.iconShine, shineOverlay(xpShine, 0.78)]} /></View><AppText style={[styles.rewardText, darkTheme && styles.darkText]}>+{result.pointsEarned} Points</AppText></View>
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <Pressable disabled={busy} onPress={() => void again()} style={[styles.primary, busy && { opacity: 0.65 }]}>{busy ? <ActivityIndicator color="white" /> : <AppText style={styles.primaryText}>Practice again</AppText>}</Pressable>
        <Pressable onPress={() => router.replace("/practice")} style={styles.secondary}><AppText style={styles.secondaryText}>Done</AppText></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#8bd6ef", justifyContent: "center", alignItems: "center", padding: 20 }, darkSafe: { backgroundColor: "#111827" }, darkCard: { backgroundColor: "#1f2937", borderColor: "rgba(148,163,184,0.3)" }, darkText: { color: "#f8fafc" }, darkMutedText: { color: "#cbd5e1" }, card: { width: "100%", maxWidth: 440, backgroundColor: "#fff4d0", borderRadius: 30, borderWidth: 3, borderColor: "#f4b942", alignItems: "center", padding: 25, elevation: 4 }, title: { fontFamily: "FredokaBold", fontSize: 29, color: "#4b351f", textTransform: "capitalize", marginTop: 4 }, score: { fontFamily: "FredokaBold", fontSize: 44, color: "#398843", marginTop: 10 }, accuracy: { fontFamily: "FredokaMedium", fontSize: 18, color: "#674e32", marginBottom: 15 }, rewardRow: { flexDirection: "row", alignItems: "center", gap: 9, marginVertical: 4 }, iconWrap: { width: 28, height: 28, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center" }, icon: { width: 25, height: 25 }, iconShine: { position: "absolute", top: -5, left: 0, width: 8, height: 40, backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 8 }, rewardText: { fontFamily: "FredokaBold", fontSize: 19, color: "#503a20" }, primary: { width: "100%", alignItems: "center", marginTop: 24, paddingVertical: 12, borderRadius: 18, backgroundColor: "#57b957" }, primaryText: { fontFamily: "FredokaBold", fontSize: 18, color: "white", textTransform: "capitalize" }, secondary: { alignSelf: "stretch", alignItems: "center", paddingVertical: 11, marginTop: 7, borderRadius: 18, backgroundColor: "#fff" }, secondaryText: { fontFamily: "FredokaBold", fontSize: 17, color: "#624a32", textTransform: "capitalize" }, error: { fontFamily: "FredokaMedium", color: "#873d31", textAlign: "center", marginTop: 10 } });
