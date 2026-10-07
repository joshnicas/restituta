import AppText from "../components/app-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPracticeSubject, postStartPractice, type PracticeSubjectResponse, type PracticeStartInput } from "../lib/api";
import { getPracticeErrorMessage } from "../lib/practice-errors";
import { useDarkTheme } from "../lib/use-dark-theme";

export default function PracticeSubjectScreen() {
  const router = useRouter();
  const darkTheme = useDarkTheme();
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const [data, setData] = useState<PracticeSubjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const token = await AsyncStorage.getItem("kido.authToken");
      if (!token) throw new Error("Please sign in to use Practice.");
      setData(await getPracticeSubject(String(subjectId ?? ""), token));
    } catch (reason) { setError(getPracticeErrorMessage(reason, "Could not load this subject. Please try again.")); }
    finally { setLoading(false); }
  }, [subjectId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const start = async (body: PracticeStartInput) => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const token = await AsyncStorage.getItem("kido.authToken");
      if (!token) throw new Error("Please sign in to use Practice.");
      const response = await postStartPractice(body, token);
      router.push({ pathname: "/practice-game", params: { sessionId: response.session.id } });
    } catch (reason) {
      const status = Number((reason as { status?: number } | null)?.status);
      setError(status === 401
        ? "Please sign in to use Practice."
        : status === 404
          ? "No questions are ready yet. Try another topic or come back later."
          : "We couldn't start this practice right now. Please check your connection and try again.");
    }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, darkTheme && styles.darkSafe]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={[styles.back, darkTheme && styles.darkSurface]}><AppText style={[styles.backText, darkTheme && styles.darkText]}>‹  Back</AppText></Pressable>
        {loading ? <ActivityIndicator size="large" color="#f4b942" style={{ marginTop: 55 }} /> : data ? <>
          <AppText style={[styles.title, darkTheme && styles.darkText]}>{data.subject.name}</AppText>
          <Pressable disabled={busy} onPress={() => void start({ mode: "SUBJECT", subjectId: data.subject.id })} style={[styles.allCard, darkTheme && styles.darkCard]}>
            <AppText style={[styles.allTitle, darkTheme && styles.darkText]}>All {data.subject.name}</AppText><AppText style={[styles.meta, darkTheme && styles.darkMutedText]}>Mixed topics in this subject</AppText><AppText style={styles.start}>{busy ? "Starting..." : "Start ›"}</AppText>
          </Pressable>
          <AppText style={[styles.heading, darkTheme && styles.darkText]}>Topics</AppText>
          {data.topics.length ? data.topics.map((topic) => <Pressable key={topic.id} disabled={busy} onPress={() => void start({ mode: "SUBJECT", subjectId: data.subject.id, topicId: topic.id })} style={[styles.topic, darkTheme && styles.darkCard]}>
            <View style={{ flex: 1 }}><AppText style={[styles.topicName, darkTheme && styles.darkText]}>{topic.name}</AppText><AppText style={[styles.meta, darkTheme && styles.darkMutedText]}>{topic.accuracy === null ? "Keep practicing to see accuracy" : `${topic.accuracy}% accuracy`}</AppText></View><AppText style={styles.chevron}>›</AppText>
          </Pressable>) : <View style={[styles.empty, darkTheme && styles.darkCard]}><AppText style={[styles.meta, darkTheme && styles.darkMutedText]}>No topics are ready yet. Try all {data.subject.name}.</AppText></View>}
        </> : <View style={[styles.empty, darkTheme && styles.darkCard]}><AppText style={styles.error}>{error || "No questions yet! 🌱"}</AppText><Pressable onPress={() => void load()}><AppText style={styles.start}>Try again</AppText></Pressable></View>}
        {error && data ? <AppText style={styles.error}>{error}</AppText> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#8bd6ef" }, darkSafe: { backgroundColor: "#111827" }, darkCard: { backgroundColor: "#1f2937", borderColor: "rgba(148,163,184,0.3)" }, darkSurface: { backgroundColor: "#374151", borderColor: "#4b5563" }, darkText: { color: "#f8fafc" }, darkMutedText: { color: "#cbd5e1" }, content: { padding: 19, paddingBottom: 70, maxWidth: 650, width: "100%", alignSelf: "center" }, back: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 15, backgroundColor: "#fff4d0", borderWidth: 2, borderColor: "#f4b942", marginBottom: 20 }, backText: { fontFamily: "FredokaBold", color: "#614521", fontSize: 16 }, title: { fontFamily: "FredokaBold", fontSize: 29, color: "#3a2a1b", marginBottom: 14 }, allCard: { backgroundColor: "#fff4d0", borderWidth: 3, borderColor: "#f4b942", padding: 17, borderRadius: 23, marginBottom: 22 }, allTitle: { fontFamily: "FredokaBold", fontSize: 21, color: "#49331b", textTransform: "capitalize" }, meta: { fontFamily: "FredokaRegular", fontSize: 14, color: "#746047", marginTop: 3 }, start: { fontFamily: "FredokaBold", fontSize: 17, color: "#478943", marginTop: 11, textTransform: "capitalize" }, heading: { fontFamily: "FredokaBold", fontSize: 21, color: "#3a2a1b", marginBottom: 10, textTransform: "capitalize" }, topic: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 2, borderColor: "#d6edf2", paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", marginBottom: 9 }, topicName: { fontFamily: "FredokaBold", fontSize: 17, color: "#45331f" }, chevron: { fontFamily: "FredokaBold", fontSize: 27, color: "#98743d" }, empty: { backgroundColor: "#fff", borderRadius: 18, padding: 16 }, error: { fontFamily: "FredokaMedium", fontSize: 15, color: "#873d31", marginTop: 12 } });
