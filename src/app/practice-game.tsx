import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../components/app-text";
import { getPracticeSession, postCompletePractice, postPracticeAnswer, type PracticeAnswerResponse } from "../lib/api";
import { API_BASE } from "../lib/config";
import { useKidoLanguage } from "../lib/language-context";
import type { PracticeRoutePayload } from "../lib/practice-navigation";
import { recordCompletedPracticeSection } from "../lib/practice-navigation";
import { useDarkTheme } from "../lib/use-dark-theme";
import { usePracticePressSound } from "../lib/practice-press-sound";

const imageSource = (url?: string | null) => !url ? undefined : { uri: /^https?:\/\//i.test(url) ? url : `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}` };

function toErrorMessage(reason: unknown) {
  const status = Number((reason as any)?.status);
  if (status === 401) return "Please sign in to continue.";
  if (status === 404) return "This practice session has expired. Start a new one.";
  if (status === 409) return "That answer was already saved. Let's continue.";
  return reason instanceof Error ? reason.message : "Could not save your answer. Please try again.";
}

export default function PracticeGameScreen() {
  const router = useRouter();
  const darkTheme = useDarkTheme();
  const playPressSound = usePracticePressSound();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { language } = useKidoLanguage();
  const [payload, setPayload] = useState<PracticeRoutePayload | null>(null);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<PracticeAnswerResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectionKey, setSelectionKey] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [advancing, setAdvancing] = useState(false);
  const [answerReveal] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await AsyncStorage.getItem("kido.authToken");
        if (!sessionId || !token) throw new Error("This practice session has expired. Start a new one.");
        const resumed = await getPracticeSession(String(sessionId), token);
        if (!active) return;
        const next: PracticeRoutePayload = { session: resumed.session, questions: resumed.questions };
        if (resumed.session.completed && resumed.result) {
          await recordCompletedPracticeSection(resumed.session);
          router.replace({ pathname: "/practice-result", params: { result: JSON.stringify({ ...next, result: resumed.result }) } });
          return;
        }
        setPayload(next);
        const answered = resumed.answeredQuestionIds ?? [];
        setAnsweredIds(answered);
        const nextIndex = resumed.questions.findIndex((item) => !answered.includes(item.id));
        if (nextIndex >= 0) setIndex(nextIndex);
        else {
          const result = await postCompletePractice(resumed.session.id, token);
          await recordCompletedPracticeSection(resumed.session);
          router.replace({ pathname: "/practice-result", params: { result: JSON.stringify({ ...next, result }) } });
        }
      } catch (reason) { if (active) setError(toErrorMessage(reason)); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [router, sessionId]);

  const question = payload?.questions[index];
  const code = question?.gameType.code.toUpperCase();
  const options = useMemo(() => [...(question?.options ?? [])].sort((left, right) => left.order - right.order), [question]);
  const answerImages = useMemo(() => options.map((option) => imageSource(option.image)), [options]);
  const allOptionsHaveImages = answerImages.length > 1 && answerImages.every(Boolean);
  const questionType = code === "TRUE_FALSE" ? "true-false" : code === "IMAGE_CHOICE" && allOptionsHaveImages ? "image-choice" : "multiple-choice";
  const answers = useMemo(() => questionType === "true-false"
    ? (language === "SW" ? ["Kweli", "Si kweli"] : ["True", "False"])
    : questionType === "image-choice" ? options.map((option) => option.id) : options.map((option) => option.text?.trim() || option.id), [language, options, questionType]);
  const mediaImages = useMemo(() => (question?.media ?? []).filter((item) => item.type === "IMAGE").sort((a, b) => a.order - b.order).map((item) => imageSource(item.url)).filter((item): item is { uri: string } => Boolean(item)), [question]);

  useEffect(() => {
    Animated.timing(answerReveal, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [answerReveal, index]);

  const submit = async (selected: string, at: number) => {
    if (!question || !payload || saving || feedback) return;
    setSaving(true); setError("");
    setSelectedOptionIndex(at);
    try {
      const token = await AsyncStorage.getItem("kido.authToken");
      if (!token) throw new Error("Please sign in to continue.");
      let body: { questionId: string; selectedOptionId?: string; answer?: boolean };
      if (questionType === "true-false") {
        body = { questionId: question.id, answer: at === 0 };
      } else {
        const option = options[at];
        if (!option) throw new Error("Choose an answer to continue.");
        body = { questionId: question.id, selectedOptionId: option.id };
      }
      const answer = await postPracticeAnswer(payload.session.id, body, token);
      setFeedback(answer);
      const answeredNext = [...answeredIds, question.id];
      setAnsweredIds(answeredNext);
      setPayload((current) => current ? { ...current, session: { ...current.session, answeredQuestions: answer.answeredQuestions, correctAnswers: current.session.correctAnswers + Number(answer.correct), pointsEarned: current.session.pointsEarned + answer.pointsEarned } } : current);
      const nextIndex = payload.questions.findIndex((item) => item.id !== question.id && !answeredNext.includes(item.id));
      if (nextIndex < 0) {
        const result = await postCompletePractice(payload.session.id, token);
        await recordCompletedPracticeSection(payload.session);
        setAdvancing(true);
        setTimeout(() => router.replace({ pathname: "/practice-result", params: { result: JSON.stringify({ session: payload.session, questions: payload.questions, result }) } }), 850);
      } else {
        setAdvancing(true);
        setTimeout(() => {
          setIndex(nextIndex);
          setFeedback(null); setSelectedOptionIndex(null); setAdvancing(false); setSelectionKey((key) => key + 1);
          answerReveal.setValue(0);
        }, 850);
      }
    } catch (reason) { setError(toErrorMessage(reason)); setSelectedOptionIndex(null); setSelectionKey((key) => key + 1); }
    finally { setSaving(false); }
  };

  if (loading) return <SafeAreaView style={[styles.loading, darkTheme && styles.darkSafe]}><ActivityIndicator size="large" color="#f4b942" /></SafeAreaView>;
  if (!payload) return <SafeAreaView style={[styles.loading, darkTheme && styles.darkSafe]}><AppText style={styles.error}>{error || "This practice session could not be opened."}</AppText><Pressable onPress={() => { playPressSound(); router.replace("/practice"); }}><AppText style={styles.done}>Practice home</AppText></Pressable></SafeAreaView>;
  if (!question) return <SafeAreaView style={[styles.loading, darkTheme && styles.darkSafe]}><AppText style={styles.error}>No questions yet! 🌱</AppText><Pressable onPress={() => { playPressSound(); router.replace("/practice"); }}><AppText style={styles.done}>Practice home</AppText></Pressable></SafeAreaView>;

  const hasInlineImages = /image\(\d+\)/i.test(question.text);
  const questionParts = question.text.split(/(image\(\d+\))/gi);
  const isImageEquation = hasInlineImages && (question.text.match(/image\(\d+\)/gi)?.length ?? 0) >= 2 && /[+=×÷]/.test(question.text);
  const correctAnswer = feedback?.correctAnswer.toLowerCase();
  const promptLength = question.text.length;
  const promptFontSize = promptLength > 240 ? 16 : promptLength > 150 ? 18 : promptLength > 90 ? 20 : 23;
  let leadingImageParts = 0;
  while (leadingImageParts < questionParts.length && (!questionParts[leadingImageParts].trim() || /^image\(\d+\)$/i.test(questionParts[leadingImageParts].trim()))) {
    leadingImageParts += 1;
  }
  const leadingImages = questionParts.slice(0, leadingImageParts)
    .map((part) => part.match(/^image\((\d+)\)$/i))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => mediaImages[Number(match[1]) - 1])
    .filter((source): source is { uri: string } => Boolean(source));

  return (
    <SafeAreaView style={[styles.safe, darkTheme && styles.darkSafe]}>
      <View style={styles.screen}>
        <View style={styles.topRow}>
          <Pressable onPress={() => { playPressSound(); router.replace("/practice"); }} style={[styles.close, darkTheme && styles.darkCard]} accessibilityRole="button" accessibilityLabel="Return to practice">
            <AppText style={[styles.closeText, darkTheme && styles.darkText]}>‹</AppText>
          </Pressable>
          <View style={styles.progressWrap}>
            <View style={styles.progressLabelRow}>
              <AppText style={[styles.progress, darkTheme && styles.darkText]}>Question {index + 1} of {payload.questions.length}</AppText>
              <AppText style={[styles.progressPercent, darkTheme && styles.darkMutedText]}>{Math.round(((index + 1) / payload.questions.length) * 100)}%</AppText>
            </View>
            <View style={styles.track}><View style={[styles.fill, { width: `${((index + 1) / payload.questions.length) * 100}%` }]} /></View>
          </View>
        </View>

        <ScrollView style={styles.questionScroll} contentContainerStyle={styles.questionContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.questionCard, darkTheme && styles.darkCard]}>
          <View style={styles.questionMeta}>
            <AppText style={styles.questionNumber}>QUESTION {index + 1}</AppText>
          </View>
          {!hasInlineImages && mediaImages[0] ? <Image source={mediaImages[0]} style={[styles.questionMedia, promptLength > 120 && styles.compactQuestionMedia]} resizeMode="contain" /> : null}
          {!isImageEquation && leadingImages.length ? <View style={styles.leadingImageRow}>
            {leadingImages.map((source, imageIndex) => <Image key={`leading-image-${imageIndex}`} source={source} style={styles.leadingQuestionImage} resizeMode="contain" />)}
          </View> : null}
          {hasInlineImages ? (
            <View style={isImageEquation ? styles.equationRow : styles.questionTextFlow}>
              {(isImageEquation ? questionParts : questionParts.slice(leadingImageParts)).map((part, partIndex) => {
                const match = part.match(/^image\((\d+)\)$/i);
                const textPart = isImageEquation ? part.replace(/\s+/g, " ").trim() : partIndex === 0 ? part.trimStart() : part;
                if (!match) return textPart ? <AppText translate={false} key={`prompt-${partIndex}`} style={[isImageEquation ? styles.equationText : styles.questionTextPart, darkTheme && styles.darkText, { fontSize: promptFontSize, lineHeight: Math.round(promptFontSize * 1.3) }]}>{textPart}</AppText> : null;
                const image = mediaImages[Number(match[1]) - 1];
                return image ? <Image key={`prompt-image-${partIndex}`} source={image} style={isImageEquation ? styles.equationImage : styles.inlineQuestionImage} resizeMode="contain" /> : <AppText translate={false} key={`missing-image-${partIndex}`} style={[styles.equationText, darkTheme && styles.darkText, { fontSize: promptFontSize, lineHeight: Math.round(promptFontSize * 1.3) }]}>{part}</AppText>;
              })}
            </View>
          ) : (
            <AppText translate={false} style={[styles.questionText, darkTheme && styles.darkText, { fontSize: promptFontSize, lineHeight: Math.round(promptFontSize * 1.3) }]}>{question.text}</AppText>
          )}
        </View>

        <View style={styles.answerList}>
          {answers.map((answer, answerIndex) => {
            const option = options[answerIndex];
            const isSelected = selectedOptionIndex === answerIndex;
            const isCorrect = correctAnswer === answer.toLowerCase() || correctAnswer === option?.id.toLowerCase();
            const showCorrect = Boolean(feedback && isCorrect);
            const showWrong = Boolean(feedback && isSelected && !feedback.correct);
            return (
              <Animated.View key={`${selectionKey}-${option?.id ?? answer}`} style={{ opacity: answerReveal, transform: [{ translateY: answerReveal.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
                <Pressable
                  accessibilityRole="button"
                  disabled={saving || Boolean(feedback)}
                  onPress={() => { playPressSound(); void submit(answer, answerIndex); }}
                  style={({ pressed }) => [styles.answerButton, darkTheme && styles.darkCard, showCorrect && styles.correctAnswer, showWrong && styles.wrongAnswer, pressed && styles.answerPressed, (saving || feedback) && !showCorrect && !showWrong && styles.answerDisabled]}
                >
                  <AppText style={[styles.answerLetter, darkTheme && styles.darkLetter, (showCorrect || showWrong) && styles.answerLetterActive]}>{String.fromCharCode(65 + answerIndex)}</AppText>
                  {questionType === "image-choice" && answerImages[answerIndex] ? <Image source={answerImages[answerIndex]} style={styles.answerImage} resizeMode="contain" /> : null}
                  <AppText translate={questionType !== "image-choice"} style={[styles.answerText, darkTheme && styles.darkText]}>{questionType === "image-choice" && option?.text?.trim() ? option.text.trim() : answer}</AppText>
                  {(showCorrect || showWrong) ? <AppText style={[styles.answerCheck, showWrong && styles.answerWrongMark]}>{showCorrect ? "✓" : "×"}</AppText> : null}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {feedback ? <View style={[styles.feedbackBox, feedback.correct ? styles.feedbackCorrect : styles.feedbackWrong]}><AppText style={styles.feedbackText}>{feedback.correct ? "Correct!" : "Not quite. The correct answer is highlighted."}</AppText></View> : null}
        {error ? <View style={styles.errorBox}><AppText style={styles.error}>{error}</AppText><Pressable disabled={saving} onPress={() => { playPressSound(); setError(""); setSelectionKey((key) => key + 1); }}><AppText style={styles.retry}>Try again</AppText></Pressable></View> : null}
        {advancing ? <AppText style={styles.wait}>{index + 1 >= payload.questions.length ? "Great job!" : "Next question..."}</AppText> : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8c25a" },
  darkSafe: { backgroundColor: "#111827" }, darkCard: { backgroundColor: "#1f2937", borderColor: "rgba(148,163,184,0.3)" }, darkText: { color: "#f8fafc" }, darkMutedText: { color: "#cbd5e1" }, darkLetter: { backgroundColor: "#374151", color: "#e5e7eb" },
  screen: { flex: 1, width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  loading: { flex: 1, backgroundColor: "#f8c25a", justifyContent: "center", alignItems: "center", gap: 20, padding: 24 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  close: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#fff4d0", borderWidth: 1.5, borderColor: "#e8b84b", alignItems: "center", justifyContent: "center" },
  closeText: { fontFamily: "FredokaMedium", fontSize: 32, lineHeight: 35, color: "#503617", marginTop: -3 },
  progressWrap: { flex: 1 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progress: { fontFamily: "FredokaBold", fontSize: 15, color: "#503617" },
  progressPercent: { fontFamily: "FredokaMedium", fontSize: 13, color: "#6b4a28" },
  track: { width: "100%", height: 9, backgroundColor: "rgba(80,54,23,0.15)", borderRadius: 8, marginTop: 8, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: "#37875e", borderRadius: 8 },
  questionScroll: { flex: 1 },
  questionContent: { paddingBottom: 28, gap: 12 },
  questionCard: { width: "100%", maxWidth: 560, alignSelf: "center", backgroundColor: "#fffaf0", borderWidth: 1.5, borderColor: "#efd58f", borderRadius: 24, padding: 20, marginBottom: 2 },
  questionMeta: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  questionNumber: { color: "#478943", backgroundColor: "#e8f3df", overflow: "hidden", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontFamily: "FredokaBold", letterSpacing: 0.6, fontSize: 11 },
  questionMedia: { width: "100%", height: 170, marginBottom: 14 },
  compactQuestionMedia: { height: 110, marginBottom: 10 },
  leadingImageRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-start", marginBottom: 10 },
  leadingQuestionImage: { width: 76, height: 76, marginRight: 6 },
  questionTextFlow: { width: "100%", flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 2 },
  equationRow: { width: "100%", flexDirection: "row", flexWrap: "nowrap", alignItems: "center", justifyContent: "center", marginTop: 2, minHeight: 76 },
  equationImage: { width: 64, height: 64, flexShrink: 0, marginHorizontal: 4 },
  equationText: { color: "#44331f", fontFamily: "FredokaBold", includeFontPadding: false, flexShrink: 0, textAlign: "center", marginHorizontal: 2 },
  inlineQuestionImage: { width: 38, height: 38, marginHorizontal: 2, marginVertical: 2 },
  questionTextPart: { color: "#44331f", fontFamily: "FredokaBold", includeFontPadding: false, textAlignVertical: "top", flexShrink: 1 },
  questionText: { width: "100%", color: "#44331f", fontFamily: "FredokaBold", fontSize: 23, lineHeight: 30, marginTop: 2, includeFontPadding: false, textAlignVertical: "top", flexShrink: 1 },
  answerList: { width: "100%", maxWidth: 560, alignSelf: "center", gap: 9 },
  answerButton: { minHeight: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, paddingVertical: 10, borderRadius: 17, borderWidth: 1.5, borderColor: "#eddfbd", backgroundColor: "#ffffff" },
  answerPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  answerDisabled: { opacity: 0.68 },
  correctAnswer: { borderColor: "#68a765", backgroundColor: "#edf7e9" },
  wrongAnswer: { borderColor: "#d98270", backgroundColor: "#fff0eb" },
  answerLetter: { width: 32, height: 32, borderRadius: 11, overflow: "hidden", paddingTop: 6, marginRight: 11, textAlign: "center", backgroundColor: "#f5eedf", color: "#715d3d", fontFamily: "FredokaBold", fontSize: 13 },
  answerLetterActive: { backgroundColor: "#d8ebd1", color: "#286544" },
  answerImage: { width: 44, height: 44, marginRight: 11 },
  answerText: { flex: 1, color: "#44331f", fontFamily: "FredokaMedium", fontSize: 16 },
  answerCheck: { fontSize: 20, color: "#37875e", fontFamily: "FredokaBold", marginLeft: 8 },
  answerWrongMark: { color: "#c95a43" },
  feedbackBox: { width: "100%", maxWidth: 560, alignSelf: "center", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, marginTop: 2 },
  feedbackCorrect: { backgroundColor: "#e8f3df", borderColor: "#c8dfbd", borderWidth: 1 },
  feedbackWrong: { backgroundColor: "#fff0eb", borderColor: "#efd0c8", borderWidth: 1 },
  feedbackText: { color: "#503617", fontFamily: "FredokaMedium", fontSize: 14, textAlign: "center" },
  errorBox: { alignSelf: "center", width: "100%", maxWidth: 560, backgroundColor: "#fff1ef", borderRadius: 16, padding: 14, marginTop: 2, borderColor: "#e8b6ad", borderWidth: 1 },
  error: { fontFamily: "FredokaMedium", color: "#873d31", fontSize: 15, textAlign: "center" },
  retry: { fontFamily: "FredokaBold", color: "#478943", fontSize: 16, textAlign: "center", marginTop: 7 },
  wait: { alignSelf: "center", fontFamily: "FredokaBold", fontSize: 17, color: "#503617", marginTop: 4 },
  done: { fontFamily: "FredokaBold", fontSize: 17, color: "#478943" }
});
