import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayer } from "expo-audio";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import {
    Animated,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../components/app-text";
import {
    claimUserChallenge,
    getAllUserGifts,
    getChallenges,
    getCurrentAuthToken,
    getGradeSubjectLevels,
    getGradeSubjects,
    getGrades,
    getLevelQuestions,
    getMyStreak,
    getUserChallenges,
    getUserLevelProgress,
    getUserMe,
    joinChallenge,
    updateUserChallengeProgress,
    type Challenge,
    type GameQuestion,
    type UserChallenge,
    type UserStreakResponse,
} from "../lib/api";
import { useAudioPreferences } from "../lib/audio-preferences";
import { API_BASE } from "../lib/config";
import { getKidoLanguage } from "../lib/language-preferences";
import { getPlayLandErrorMessage } from "../lib/network-errors";
import { useDarkTheme } from "../lib/use-dark-theme";

const colors = { ink: "#503617", muted: "#6b4a28", purple: "#8a5a1d", yellow: "#f4b942", green: "#37875e" };
const xpFillSound = require("../assets/sound.effects/xp_fill_game_sound.mp3");
const pressSound = require("../assets/sound.effects/pop.mp3");

const toMediaUrl = (url: string) =>
  /^https?:\/\//i.test(url)
    ? url
    : `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
const challengePresentation: Record<Challenge["type"], { emoji: string; subtitle: string; background: string; accent: string }> = {
  DAILY: { emoji: "🧠", subtitle: "Knowledge Challenge", background: "#F1EDFF", accent: "#7865E8" },
  WEEKLY: { emoji: "🏆", subtitle: "Weekly Challenge", background: "#FFF5DF", accent: "#D18A20" },
  SPECIAL: { emoji: "🎪", subtitle: "Special Event", background: "#F1EDFF", accent: "#7865E8" },
  SPEED: { emoji: "⚡", subtitle: "Speed Challenge", background: "#FFF5DF", accent: "#D18A20" },
  PERFECT: { emoji: "🎯", subtitle: "Perfect Challenge", background: "#FFF0F1", accent: "#DC6470" },
};
type ChallengeQuestion = {
  id: string;
  prompt: string;
  answer: string;
  options: string[];
  media?: string[];
};

type GradeSubject = {
  id?: string | number;
  gradeSubjectId?: string | number;
  subjectId?: string | number;
  name?: string;
  title?: string;
  subjectName?: string;
  subject?: { id?: string | number; name?: string; title?: string };
  Subject?: { id?: string | number; name?: string; title?: string };
  subjectDetails?: { name?: string; title?: string };
};

type GameLevel = {
  id?: string | number;
  levelId?: string | number;
  levelNumber?: number;
  number?: number;
  name?: string;
};

const unwrapList = (payload: any, keys: string[]): any[] => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  return Array.isArray(payload?.data) ? payload.data : [];
};

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[nextIndex]] = [result[nextIndex], result[index]];
  }
  return result;
};

const getPlayableQuestion = (question: GameQuestion, language: "EN" | "SW" = "EN"): ChallengeQuestion | null => {
  const code = question.gameType?.code?.toUpperCase();
  const prompt = question.text?.trim();
  const media = (question.media ?? [])
    .filter((item) => item.type === "IMAGE")
    .sort((left, right) => left.order - right.order)
    .map((item) => toMediaUrl(item.url));

  if (!prompt) return null;
  if (code === "TRUE_FALSE" && question.trueFalseAnswer != null) {
    const options = language === "SW" ? ["Kweli", "Si kweli"] : ["True", "False"];
    return {
      id: String(question.id),
      prompt,
      answer: question.trueFalseAnswer ? options[0] : options[1],
      options,
      media,
    };
  }
  if (code !== "MULTIPLE_CHOICE" && code !== "IMAGE_CHOICE") return null;

  const options = [...(question.options ?? [])].sort((left, right) => left.order - right.order);
  const correctOption = options.find((option) => option.isCorrect);
  const answers = options.map((option) => option.text?.trim() || option.id);
  if (answers.length < 2 || !correctOption) return null;
  return {
    id: String(question.id),
    prompt,
    answer: correctOption.text?.trim() || correctOption.id,
    options: answers,
    media,
  };
};

const getSubjectName = (item: GradeSubject) =>
  item.name ?? item.subject?.name ?? item.Subject?.name ?? item.subjectName ??
  item.subject?.title ?? item.subjectDetails?.name ?? item.title ?? "Subject";

const getLevelNumber = (item: GameLevel) =>
  Number(item.levelNumber ?? item.number ?? String(item.name ?? "").match(/\d+/)?.[0] ?? 0);

const getProgressRecords = (payload: any) =>
  unwrapList(payload, ["progress", "progresses", "records"]);

const getQuestionCollection = (payload: any): GameQuestion[] =>
  unwrapList(payload, ["questions"]) as GameQuestion[];

const getUserPayload = (response: any) =>
  response?.user ?? response?.data?.user ?? response?.data ?? response;

const getTanzaniaDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const getIsoWeekKey = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const year = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstDay = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstDay);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${year}-W${String(week).padStart(2, "0")}`;
};

const getTanzaniaDayIndex = (date = new Date()) => {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Dar_es_Salaam",
    weekday: "short",
  }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
};

const getMondayCountdown = (now = new Date()) => {
  const day = getTanzaniaDayIndex(now);
  if (day !== 0 && day !== 6) return null;
  const today = new Date(`${getTanzaniaDateKey(now)}T00:00:00.000Z`);
  const daysUntilMonday = day === 6 ? 2 : 1;
  const nextMondayUtc = today.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000;
  const remainingSeconds = Math.max(0, Math.floor((nextMondayUtc - now.getTime()) / 1000));
  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
};

function QuestionPrompt({ question }: { question: ChallengeQuestion }) {
  const parts = question.prompt.split(/(image\(\d+\))/gi);
  const hasInlineImages = /image\(\d+\)/i.test(question.prompt);

  if (!hasInlineImages) {
    return (
      <>
        {question.media?.[0] && (
          <Image source={{ uri: question.media[0] }} style={styles.questionMedia} resizeMode="contain" />
        )}
        <AppText translate={false} style={styles.questionPrompt}>{question.prompt}</AppText>
      </>
    );
  }

  return (
    <AppText translate={false} style={styles.questionPrompt}>
      {parts.map((part, index) => {
        const match = part.match(/^image\((\d+)\)$/i);
        if (!match) return <AppText translate={false} key={`prompt-text-${index}`}>{part}</AppText>;
        const imageUrl = question.media?.[Number(match[1]) - 1];
        if (!imageUrl) return <AppText translate={false} key={`prompt-image-missing-${index}`}>{part}</AppText>;
        return (
          <Image
            key={`prompt-image-${index}`}
            source={{ uri: imageUrl }}
            style={styles.inlineQuestionImage}
            resizeMode="contain"
          />
        );
      })}
    </AppText>
  );
}

function Reward({ emoji, amount, iconSource }: { emoji: string; amount: string; iconSource?: ImageSourcePropType }) {
  return <View style={styles.reward}>{iconSource ? <Image source={iconSource} style={styles.rewardIcon} resizeMode="contain" /> : <AppText style={styles.rewardEmoji}>{emoji}</AppText>}<AppText style={styles.rewardAmount}>{amount}</AppText></View>;
}

export default function ChallengeScreen() {
  const router = useRouter();
  const darkTheme = useDarkTheme();
  const { soundEnabled, preferencesLoaded } = useAudioPreferences();
  const xpFillPlayer = useAudioPlayer(xpFillSound);
  const pressPlayer = useAudioPlayer(pressSound);
  const playPressSound = useCallback(() => {
    if (!preferencesLoaded || !soundEnabled) return;
    try {
      pressPlayer.seekTo(0);
      pressPlayer.play();
    } catch {
      // Keep the challenge action working if audio playback is unavailable.
    }
  }, [preferencesLoaded, pressPlayer, soundEnabled]);
  const [claimProgress] = useState(() => new Animated.Value(0));
  const [pointsScale] = useState(() => new Animated.Value(1));
  const [starsScale] = useState(() => new Animated.Value(1));
  const rocketMotion = useRef(new Animated.Value(0)).current;
  const claimStartedRef = useRef(false);
  const [claimAnimationStarted, setClaimAnimationStarted] = useState(false);
  const [claimAnimationComplete, setClaimAnimationComplete] = useState(false);
  const [animatedPoints, setAnimatedPoints] = useState(0);
  const [animatedStars, setAnimatedStars] = useState(0);
  const [gradeName, setGradeName] = useState("");
  const [stars, setStars] = useState(0);
  const [xp, setXp] = useState(0);
  const [subjectName, setSubjectName] = useState("");
  const [dailyGradeSubjectId, setDailyGradeSubjectId] = useState<string | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<Challenge | null>(null);
  const [dailyParticipation, setDailyParticipation] = useState<UserChallenge | null>(null);
  const [weeklyChallenge, setWeeklyChallenge] = useState<Challenge | null>(null);
  const [weeklyParticipation, setWeeklyParticipation] = useState<UserChallenge | null>(null);
  const [streakWeek, setStreakWeek] = useState<UserStreakResponse["week"]>([]);
  const [mondayCountdown, setMondayCountdown] = useState<string | null>(() => getMondayCountdown());
  const [availableChallenges, setAvailableChallenges] = useState<Challenge[]>([]);
  const [authToken, setAuthToken] = useState("");
  const [progressSaveError, setProgressSaveError] = useState("");
  const [claimError, setClaimError] = useState("");
  const [questions, setQuestions] = useState<ChallengeQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsError, setQuestionsError] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [dailyLocked, setDailyLocked] = useState(false);
  const [dailyStarted, setDailyStarted] = useState(false);
  const [dailyStartLoading, setDailyStartLoading] = useState(false);
  const showReadyRocket = !questionsLoading && !questionsError && !completed && !dailyLocked && !dailyStarted;

  useEffect(() => {
    if (!showReadyRocket) {
      rocketMotion.stopAnimation();
      rocketMotion.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(rocketMotion, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(rocketMotion, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [rocketMotion, showReadyRocket]);

  const question = questions[questionIndex];
  const questionTarget = dailyChallenge?.targetQuestions ?? 10;
  const weeklyTarget = 5;
  const tanzaniaToday = getTanzaniaDateKey();
  const currentWeekKey = getIsoWeekKey(tanzaniaToday);
  const weeklyDayStates = (streakWeek ?? [])
    .filter((day) => getIsoWeekKey(day.date) === currentWeekKey)
    .slice(0, 5);
  const weeklyCompletedCount = Math.min(weeklyTarget, weeklyDayStates.filter((day) => day.complete).length);
  const missedWeekday = weeklyDayStates.find((day) => day.date < tanzaniaToday && !day.complete);
  const weeklyFailed = Boolean(weeklyParticipation?.failed || missedWeekday);
  const progress = completed ? questionTarget : questionIndex;
  const earnedPoints = dailyParticipation?.pointsEarned ?? 0;
  const earnedStars = dailyParticipation?.starsEarned ?? 0;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void AsyncStorage.getItem("kido.authToken").then(async (token) => {
        if (!token) return;
        try {
          const streak = await getMyStreak(token);
          if (active) setStreakWeek(streak.week ?? []);
        } catch {
          // Keep the last available weekday marks if a refresh is temporarily unavailable.
        }
      });
      return () => { active = false; };
    }, []),
  );

  useEffect(() => {
    const updateCountdown = () => setMondayCountdown(getMondayCountdown());
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const listenerId = claimProgress.addListener(({ value }) => {
      setAnimatedPoints(Math.round(earnedPoints * value));
      setAnimatedStars(Math.round(earnedStars * value));
    });
    return () => {
      claimProgress.removeListener(listenerId);
      claimProgress.stopAnimation();
      try {
        xpFillPlayer.pause();
      } catch {
        // Ignore player cleanup errors.
      }
    };
  }, [claimProgress, earnedPoints, earnedStars, xpFillPlayer]);

  const claimRewards = async () => {
    if (claimStartedRef.current || dailyParticipation?.claimed || !completed || !dailyParticipation || !authToken) return;
    claimStartedRef.current = true;
    setClaimAnimationStarted(true);
    setClaimError("");

    try {
      const response = await claimUserChallenge(dailyParticipation.id, authToken);
      const claimedProgress = response.userChallenge;
      setDailyParticipation(claimedProgress);
      const nextXp = xp + claimedProgress.pointsEarned;
      const nextStars = stars + claimedProgress.starsEarned;
      setXp(nextXp);
      setStars(nextStars);
      try {
        await AsyncStorage.multiSet([
          ["kido.xp", String(nextXp)],
          ["kido.stars", String(nextStars)],
        ]);
      } catch {
        // The backend claim succeeded; keep going if local caching fails.
      }

      setAnimatedPoints(0);
      setAnimatedStars(0);
      claimProgress.setValue(0);
      pointsScale.setValue(0.72);
      starsScale.setValue(0.72);

      if (preferencesLoaded && soundEnabled) {
        try {
          xpFillPlayer.seekTo(0);
          xpFillPlayer.play();
        } catch {
          // Ignore playback errors and keep the reward animation running.
        }
      }

      Animated.parallel([
        Animated.timing(claimProgress, {
          toValue: 1,
          duration: 1350,
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.delay(180),
          Animated.spring(pointsScale, { toValue: 1.18, friction: 4, tension: 150, useNativeDriver: true }),
          Animated.spring(pointsScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(420),
          Animated.spring(starsScale, { toValue: 1.25, friction: 4, tension: 150, useNativeDriver: true }),
          Animated.spring(starsScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
        ]),
      ]).start(({ finished: animationFinished }) => {
        try {
          xpFillPlayer.pause();
        } catch {
          // Ignore player cleanup errors.
        }
        if (animationFinished) setClaimAnimationComplete(true);
      });
    } catch (error) {
      claimStartedRef.current = false;
      setClaimAnimationStarted(false);
      setClaimError(getPlayLandErrorMessage(error, "Could not claim your challenge rewards. Try again."));
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadDailyChallenge = async () => {
      setQuestionsLoading(true);
      setQuestionsError("");
      try {
        const [storedToken, storedGradeName, storedXp, storedStars] =
          await AsyncStorage.multiGet([
            "kido.authToken",
            "kido.gradeName",
            "kido.xp",
            "kido.stars",
          ]);
        const cachedXp = Number(storedXp[1]);
        const cachedStars = Number(storedStars[1]);
        if (!cancelled) {
          setGradeName(storedGradeName[1] || "");
          setXp(Number.isFinite(cachedXp) ? cachedXp : 0);
          setStars(Number.isFinite(cachedStars) ? cachedStars : 0);
        }

        const token = storedToken[1] ?? await getCurrentAuthToken();
        if (!token) throw new Error("Log in to load your daily challenge.");

        const [userResponse, progressResponse] = await Promise.all([
          getUserMe(token),
          getUserLevelProgress(token),
        ]);
        const user = getUserPayload(userResponse);
        const giftRecords: any[] = user?.id
          ? await getAllUserGifts(user.id, token).catch(() => [])
          : [];
        const gradeId = user?.gradeId ?? user?.grade?.id;
        if (gradeId == null) throw new Error("Choose your grade to load a challenge.");
        const [subjectsResponse, dailyList, weeklyList, allChallengesList, participationResponse, streakResponse] = await Promise.all([
          getGradeSubjects(gradeId),
          getChallenges({ gradeId, type: "DAILY", limit: 100 }),
          getChallenges({ gradeId, type: "WEEKLY", limit: 100 }),
          getChallenges({ gradeId, limit: 100 }),
          getUserChallenges(token),
          getMyStreak(token).catch(() => null),
        ]);
        const subjects = unwrapList(subjectsResponse, ["subjects", "gradeSubjects"]);
        const dailyOptions = unwrapList(dailyList, ["challenges"]) as Challenge[];
        const weeklyOptions = unwrapList(weeklyList, ["challenges"]) as Challenge[];
        const allChallengeOptions = unwrapList(allChallengesList, ["challenges"]) as Challenge[];
        const participationList = unwrapList(participationResponse, ["userChallenges"]) as UserChallenge[];
        const now = Date.now();
        const currentlyAvailable = (item: Challenge) =>
          (!item.gradeId || String(item.gradeId) === String(gradeId)) &&
          new Date(item.startsAt).getTime() <= now &&
          (!item.endsAt || new Date(item.endsAt).getTime() >= now);
        const todayDateKey = getTanzaniaDateKey();
        const todayPeriodKey = `DAY:${todayDateKey}`;
        const currentWeekPeriodKey = `WEEK:${getIsoWeekKey(todayDateKey)}`;
        const weekend = getTanzaniaDayIndex() === 0 || getTanzaniaDayIndex() === 6;
        const todaysParticipation = participationList.find(
          (item) => item.periodKey === todayPeriodKey && item.challenge?.type === "DAILY",
        ) ?? null;
        const dailyConfig = todaysParticipation?.challenge ?? shuffle(dailyOptions.filter(currentlyAvailable))[0];
        if (!dailyConfig) throw new Error("There is no active daily challenge for your grade yet.");
        if (!subjects.length && !todaysParticipation) throw new Error("There are no subjects available for your grade.");
        const currentWeeklyParticipation = participationList.find(
          (item) => item.periodKey === currentWeekPeriodKey && item.challenge?.type === "WEEKLY",
        ) ?? null;
        const latestWeeklyParticipation = participationList.find((item) => item.challenge?.type === "WEEKLY") ?? null;
        const weeklyRecord = currentWeeklyParticipation ?? (weekend ? latestWeeklyParticipation : null);
        const weeklyConfig = weeklyRecord?.challenge ??
          weeklyOptions.filter(currentlyAvailable)[0] ??
          latestWeeklyParticipation?.challenge ??
          null;
        const visibleChallenges = allChallengeOptions.filter(currentlyAvailable);
        const joinedWeekly = weeklyConfig && !weekend && !currentWeeklyParticipation
          ? (await joinChallenge(weeklyConfig.id, token)).userChallenge
          : null;
        const dailyProgress = todaysParticipation;
        const weeklyProgress = weeklyRecord ?? joinedWeekly;
        if (!cancelled) {
          setAuthToken(token);
          setDailyChallenge(dailyConfig);
          setDailyParticipation(dailyProgress);
          const dailyFinished = Boolean(todaysParticipation && todaysParticipation.questionsAnswered >= dailyConfig.targetQuestions);
          setDailyLocked(dailyFinished);
          setDailyStarted(Boolean(todaysParticipation && todaysParticipation.questionsAnswered > 0 && !dailyFinished));
          setWeeklyChallenge(weeklyConfig);
          setWeeklyParticipation(weeklyProgress);
          setStreakWeek(streakResponse?.week ?? []);
          setAvailableChallenges(visibleChallenges);
        }

        let nextGradeName = String(user?.grade?.name ?? "");
        if (!nextGradeName && gradeId != null) {
          const gradeList = unwrapList(await getGrades(), ["grades"]);
          nextGradeName = String(gradeList.find((grade: any) => String(grade.id) === String(gradeId))?.name ?? "");
        }
        const progressRecords = getProgressRecords(progressResponse);
        const levelXp = progressRecords.reduce(
          (total: number, record: any) => total + Number(record?.bestScore ?? record?.score ?? record?.px ?? 0), 0,
        );
        const levelStars = progressRecords.reduce(
          (total: number, record: any) => total + Number(record?.stars ?? 0), 0,
        );
        const challengeXp = participationList.reduce(
          (total, record) => total + (record.claimed ? Number(record.pointsEarned ?? 0) : 0), 0,
        );
        const challengeStars = participationList.reduce(
          (total, record) => total + (record.claimed ? Number(record.starsEarned ?? 0) : 0), 0,
        );
        const giftXp = giftRecords.reduce((total, record) => total + Number(record?.gift?.pointsAwarded ?? 0), 0);
        const giftStars = giftRecords.reduce((total, record) => total + Number(record?.gift?.starsAwarded ?? 0), 0);
        const nextXp = levelXp + challengeXp + giftXp;
        const nextStars = levelStars + challengeStars + giftStars;
        if (!cancelled) {
          if (nextGradeName) setGradeName(nextGradeName);
          setXp(Number.isFinite(nextXp) ? nextXp : 0);
          setStars(Number.isFinite(nextStars) ? nextStars : 0);
        }
        await AsyncStorage.multiSet([
          ["kido.gradeId", String(gradeId ?? "")],
          ["kido.gradeName", nextGradeName],
          ["kido.xp", String(Number.isFinite(nextXp) ? nextXp : 0)],
          ["kido.stars", String(Number.isFinite(nextStars) ? nextStars : 0)],
        ]);

        if (todaysParticipation && todaysParticipation.questionsAnswered >= dailyConfig.targetQuestions) {
          if (!cancelled) {
            setQuestionIndex(Math.min(todaysParticipation.questionsAnswered, dailyConfig.targetQuestions));
            setCorrectAnswers(todaysParticipation.correctAnswers);
            setCompleted(true);
            setQuestions([]);
          }
          return;
        }

        const availableSubjects = subjects as GradeSubject[];
        const matchingSubjects = dailyConfig.subjectId
          ? availableSubjects.filter((item) =>
              String(item.subjectId ?? item.subject?.id ?? item.Subject?.id) === String(dailyConfig.subjectId),
            )
          : availableSubjects;
        const subjectStorageKey = `kido.dailyChallengeSubject:${todayDateKey}`;
        const savedSubjectId = todaysParticipation
          ? todaysParticipation.selectedGradeSubjectId ?? await AsyncStorage.getItem(subjectStorageKey)
          : null;
        const subjectMatchesSavedId = (item: GradeSubject) =>
          [item.id, item.gradeSubjectId].some((id) => id != null && String(id) === savedSubjectId);
        const hasStartedProgress = (todaysParticipation?.questionsAnswered ?? 0) > 0;
        const legacyMathSubject = hasStartedProgress
          ? matchingSubjects.find((item) => /\bmath(s|ematics)?\b/i.test(getSubjectName(item)))
          : null;
        const selectedSubject = savedSubjectId
          ? availableSubjects.find(subjectMatchesSavedId)
          : legacyMathSubject ?? shuffle(matchingSubjects)[0];
        if (savedSubjectId && !selectedSubject) {
          throw new Error("Your started challenge subject could not be restored. Please contact support so your progress is not moved to another subject.");
        }
        if (!selectedSubject) throw new Error("The daily challenge subject is not available for your grade.");
        const gradeSubjectId = selectedSubject.id ?? selectedSubject.gradeSubjectId;
        if (gradeSubjectId == null) throw new Error("The selected subject has no grade mapping.");
        if (todaysParticipation && hasStartedProgress && !todaysParticipation.selectedGradeSubjectId) {
          const savedProgress = await updateUserChallengeProgress(
            todaysParticipation.id,
            { selectedGradeSubjectId: String(gradeSubjectId) },
            token,
          );
          if (!cancelled) setDailyParticipation(savedProgress.userChallenge);
          await AsyncStorage.setItem(subjectStorageKey, String(gradeSubjectId));
        }
        const selectedName = getSubjectName(selectedSubject);
        const levels = unwrapList(await getGradeSubjectLevels(gradeSubjectId), ["levels", "gameLevels"])
          .filter((level: GameLevel) => Boolean(level.id ?? level.levelId)) as GameLevel[];
        if (!levels.length) throw new Error(`No levels are available for ${selectedName}.`);

        const passedIds = new Set(
          progressRecords
            .filter((record: any) => record?.completed === true)
            .map((record: any) => String(record.gameLevelId ?? record.levelId ?? record.gameLevel?.id ?? "")),
        );
        const passedLevels = levels.filter((level) => passedIds.has(String(level.id ?? level.levelId)));
        const levelOne = levels.find((level) => getLevelNumber(level) === 1) ?? [...levels].sort((a, b) => getLevelNumber(a) - getLevelNumber(b))[0];
        const selectedLevels = passedLevels.length > 0 ? passedLevels : levelOne ? [levelOne] : [];
        if (!selectedLevels.length) throw new Error(`No level one questions are available for ${selectedName}.`);

        const language = await getKidoLanguage();
        const questionResponses = await Promise.all(
          selectedLevels.map((level) => getLevelQuestions(level.id ?? level.levelId!, language)),
        );
        const pool = shuffle(
          questionResponses
            .flatMap((response) => getQuestionCollection(response))
            .filter((item) => item.active !== false)
            .filter((item) => !dailyConfig.topicId || String(item.topicId) === String(dailyConfig.topicId))
            .map((item) => getPlayableQuestion(item, language))
            .filter((item): item is ChallengeQuestion => item !== null),
        );
        if (!pool.length) throw new Error(`No questions are available for ${selectedName} in your grade yet.`);
        const target = Math.max(1, dailyConfig.targetQuestions);
        const dailyQuestions = Array.from({ length: target }, (_, index) => pool[index % pool.length]);
        const answered = Math.min(dailyProgress?.questionsAnswered ?? 0, target);
        if (!cancelled) {
          setSubjectName(selectedName);
          setDailyGradeSubjectId(String(gradeSubjectId));
          setQuestions(dailyQuestions);
          setQuestionIndex(answered);
          setCorrectAnswers(dailyProgress?.correctAnswers ?? 0);
          setCompleted(Boolean(dailyProgress && dailyProgress.questionsAnswered >= target));
        }
      } catch (error) {
        if (!cancelled) {
          setQuestionsError(getPlayLandErrorMessage(error, "Could not load today's challenge."));
          setQuestions([]);
        }
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    };

    void loadDailyChallenge();
    return () => { cancelled = true; };
  }, []);

  const startDailyChallenge = async () => {
    if (dailyStartLoading || dailyStarted || !dailyChallenge || !authToken) return;
    setDailyStartLoading(true);
    setProgressSaveError("");
    try {
      if (dailyGradeSubjectId) {
        await AsyncStorage.setItem(`kido.dailyChallengeSubject:${getTanzaniaDateKey()}`, dailyGradeSubjectId);
      }
      const response = await joinChallenge(dailyChallenge.id, authToken);
      const selectedSubjectId = dailyGradeSubjectId ?? response.userChallenge.selectedGradeSubjectId;
      const startedResponse = selectedSubjectId
        ? await updateUserChallengeProgress(
            response.userChallenge.id,
            { selectedGradeSubjectId: selectedSubjectId },
            authToken,
          )
        : response;
      setDailyParticipation(startedResponse.userChallenge);
      setDailyLocked(false);
      setDailyStarted(true);
    } catch (error) {
      setProgressSaveError(getPlayLandErrorMessage(error, "Could not start today’s challenge. Try again."));
    } finally {
      setDailyStartLoading(false);
    }
  };

  const answerQuestion = (answer: string) => {
    if (selectedAnswer || !question || !dailyChallenge || !dailyParticipation || !authToken) return;
    const isCorrect = answer === question.answer;
    const nextAnswered = Math.min(questionIndex + 1, questionTarget);
    const nextCorrect = correctAnswers + Number(isCorrect);
    setSelectedAnswer(answer);
    setProgressSaveError("");

    void (async () => {
      try {
        const response = await updateUserChallengeProgress(
          dailyParticipation.id,
          { questionsAnswered: nextAnswered, correctAnswers: nextCorrect },
          authToken,
        );
        const savedProgress = response.userChallenge;
        setDailyParticipation(savedProgress);
        setCorrectAnswers(savedProgress.correctAnswers);
        const finished = savedProgress.completed;
        if (finished) {
          setCompleted(true);
        } else {
          // Unlock the answer choices before displaying the next question.
          setSelectedAnswer(null);
          setQuestionIndex(nextAnswered);
        }
      } catch (error) {
        setSelectedAnswer(null);
        setProgressSaveError(getPlayLandErrorMessage(error, "Could not save your challenge progress. Try again."));
      }
    })();
  };

  return (
    <SafeAreaView style={[styles.safeArea, darkTheme && styles.darkSafeArea]}>
      {!darkTheme && <View style={styles.backgroundGlow} />}
      {!darkTheme && <View style={styles.backgroundGlowTwo} />}
      <View style={styles.header}>
        <Pressable style={[styles.backButton, darkTheme && styles.darkControl]} onPress={() => { playPressSound(); router.back(); }} accessibilityRole="button"><AppText style={[styles.backText, darkTheme && styles.darkText]}>Back</AppText></Pressable>
        <AppText style={[styles.title, darkTheme && styles.darkText]}>Challenges</AppText>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, darkTheme && styles.darkCard]}>
          <View style={styles.heroCopy}><AppText style={[styles.heroEyebrow, darkTheme && styles.darkMutedText]}>TODAY’S QUEST</AppText><AppText style={[styles.heroTitle, darkTheme && styles.darkText]}>Daily Challenge</AppText><AppText style={[styles.heroSub, darkTheme && styles.darkMutedText]}>A little practice, a big win.</AppText><View style={[styles.gradeTag, darkTheme && styles.darkControl]}><AppText style={[styles.gradeText, darkTheme && styles.darkText]}>📚  {gradeName || "Your grade"}{subjectName ? ` · ${subjectName}` : ""}</AppText></View></View>
          <View style={styles.mascot}>
            <Image
              source={require("../assets/players/profile.png")}
              resizeMode="contain"
              style={styles.mascotImage}
            />
          </View>
          <View style={styles.heroProgressRow}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(progress / questionTarget, 1) * 100}%` as `${number}%` }]} /></View><AppText style={styles.progressLabel}>{progress}/{questionTarget}</AppText></View>
        </View>
        <View style={styles.rewardsRow}><Reward emoji="⭐" amount={`${stars} stars`} iconSource={require("../assets/star.png")} /><Reward emoji="⚡" amount={`${xp} pts`} iconSource={require("../assets/lightning.png")} /></View>
        <View style={styles.sectionHeading}><AppText style={styles.sectionTitle}>Today’s challenge</AppText><AppText style={styles.sectionHint}>{questionTarget} quick questions</AppText></View>
        {questionsLoading ? (
          <View style={[styles.statusCard, darkTheme && styles.darkCard]}><AppText style={styles.statusEmoji}>📚</AppText><AppText style={[styles.statusTitle, darkTheme && styles.darkText]}>Finding your questions...</AppText><AppText style={[styles.statusCopy, darkTheme && styles.darkMutedText]}>Choosing a subject and your passed levels.</AppText></View>
        ) : questionsError ? (
          <View style={[styles.statusCard, darkTheme && styles.darkCard]}><AppText style={styles.statusEmoji}>🌱</AppText><AppText style={[styles.statusTitle, darkTheme && styles.darkText]}>Challenge unavailable</AppText><AppText style={[styles.statusCopy, darkTheme && styles.darkMutedText]}>{questionsError}</AppText></View>
        ) : completed ? (
          <View style={[styles.completionCard, darkTheme && styles.darkCard]}><AppText style={[styles.completionTitle, darkTheme && styles.darkText]}>{dailyChallenge?.title ?? "Challenge complete!"}</AppText><AppText style={[styles.completionCopy, darkTheme && styles.darkMutedText]}>You got {correctAnswers} out of {questionTarget}. Claim your rewards to add them to your totals.</AppText>{claimError ? <AppText style={styles.progressError}>{claimError}</AppText> : null}<View style={styles.completionRewards}><Animated.View style={{ flex: 1, transform: [{ scale: pointsScale }] }}><Reward emoji="⚡" iconSource={require("../assets/lightning.png")} amount={`+${claimAnimationStarted && !claimAnimationComplete ? animatedPoints : earnedPoints} pts earned`} /></Animated.View><Animated.View style={{ flex: 1, transform: [{ scale: starsScale }] }}><Reward emoji="⭐" iconSource={require("../assets/star.png")} amount={`+${claimAnimationStarted && !claimAnimationComplete ? animatedStars : earnedStars} stars earned`} /></Animated.View></View><Pressable style={[styles.claimButton, (claimAnimationStarted || dailyParticipation?.claimed) && styles.claimButtonClaimed]} onPress={() => { playPressSound(); void claimRewards(); }} disabled={claimAnimationStarted || dailyParticipation?.claimed}><AppText style={styles.claimText}>{dailyParticipation?.claimed && !claimAnimationStarted || claimAnimationComplete ? "Claimed!" : claimAnimationStarted ? "Collecting..." : "Claim"}</AppText></Pressable></View>
        ) : dailyLocked ? (
          <View style={[styles.statusCard, darkTheme && styles.darkCard]}>
            <AppText style={styles.statusEmoji}>🔒</AppText>
            <AppText style={[styles.statusTitle, darkTheme && styles.darkText]}>Today’s challenge is already started</AppText>
            <AppText style={[styles.statusCopy, darkTheme && styles.darkMutedText]}>You can try today’s challenge only once. Come back tomorrow for a new set of questions.</AppText>
          </View>
        ) : !dailyStarted ? (
          <View style={[styles.statusCard, darkTheme && styles.darkCard]}>
            <Animated.Text
              style={[
                styles.statusEmoji,
                {
                  transform: [
                    { translateY: rocketMotion.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
                    { rotate: rocketMotion.interpolate({ inputRange: [0, 1], outputRange: ["-6deg", "6deg"] }) },
                  ],
                },
              ]}
            >
              🚀
            </Animated.Text>
            <AppText style={[styles.statusTitle, darkTheme && styles.darkText]}>Ready for today’s challenge?</AppText>
            <AppText style={[styles.statusCopy, darkTheme && styles.darkMutedText]}>You’ll get {questionTarget} questions from {subjectName || "your grade"}. Starting begins today’s one-time challenge.</AppText>
            {progressSaveError ? <AppText style={styles.progressError}>{progressSaveError}</AppText> : null}
            <Pressable style={[styles.claimButton, dailyStartLoading && styles.claimButtonClaimed]} onPress={() => { playPressSound(); void startDailyChallenge(); }} disabled={dailyStartLoading}>
              <AppText style={styles.claimText}>{dailyStartLoading ? "Starting..." : "Start challenge"}</AppText>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.questionCard, darkTheme && styles.darkCard]}>
            <View style={styles.questionMeta}><AppText style={styles.questionNumber}>QUESTION {questionIndex + 1} OF {questionTarget}</AppText><AppText style={styles.questionIcon}>✏️</AppText></View>
            <QuestionPrompt question={question} />
            {progressSaveError ? <AppText style={styles.progressError}>{progressSaveError}</AppText> : null}
            <View style={styles.answerList}>{question.options.map((option, index) => {
              const picked = selectedAnswer === option;
              const correct = selectedAnswer !== null && option === question.answer;
              return <Pressable key={option} style={[styles.answerButton, darkTheme && styles.darkControl, picked && (correct ? styles.correctAnswer : styles.wrongAnswer), !picked && correct && styles.correctAnswer]} onPress={() => { playPressSound(); void answerQuestion(option); }}><AppText style={[styles.answerLetter, darkTheme && styles.darkControl, (picked || correct) && styles.answerLetterActive]}>{String.fromCharCode(65 + index)}</AppText><AppText style={[styles.answerText, darkTheme && styles.darkText]}>{option}</AppText>{(picked || correct) && <AppText style={styles.answerCheck}>{correct ? "✓" : "×"}</AppText>}</Pressable>;
            })}</View>
          </View>
        )}
          <View style={[styles.weeklyCard, darkTheme && styles.darkCard]}>
          <View style={styles.weeklyTop}>
            <View style={styles.weeklyIcon}><AppText style={styles.trophy}>🔥</AppText></View>
            <View style={styles.weeklyCopy}>
              <AppText style={[styles.weeklyTitle, darkTheme && styles.darkText]}>Weekly Streak Challenge</AppText>
              <AppText style={[styles.weeklySubtitle, darkTheme && styles.darkMutedText]}>
                {mondayCountdown
                  ? `Starts Monday · ${mondayCountdown}`
                  : weeklyFailed
                    ? "Failed · you missed a weekday"
                    : weeklyParticipation?.completed
                      ? "Complete · weekly reward earned!"
                      : "Play at least once every weekday, Monday to Friday."}
              </AppText>
            </View>
            <AppText style={[styles.weeklyCount, weeklyFailed && styles.weeklyFailedText]}>
              {weeklyFailed ? "FAILED" : `${weeklyCompletedCount}/${weeklyTarget}`}
            </AppText>
          </View>
          <View style={styles.weekDots}>
            {["M", "T", "W", "T", "F"].map((label, index) => {
              const day = weeklyDayStates[index];
              const done = Boolean(day?.complete);
              const missed = Boolean(day && day.date < tanzaniaToday && !done);
              return (
                <View key={`${label}-${index}`} style={[styles.weekDay, done && styles.weekDayDone, missed && styles.weekDayFailed]}>
                  {done ? (
                    <Image source={require("../assets/correct2.png")} style={styles.weekDayCheck} resizeMode="contain" />
                  ) : (
                    <AppText style={[styles.weekDayText, missed && styles.weekDayTextFailed]}>
                      {missed ? "×" : label}
                    </AppText>
                  )}
                </View>
              );
            })}
          </View>
          <View style={styles.weeklyReward}>
            <AppText style={styles.weeklyRewardText}>{weeklyParticipation?.completed ? "🏆  REWARD EARNED" : "🎁  WEEKLY REWARD"}</AppText>
            <AppText style={styles.weeklyRewardValue}>{weeklyChallenge ? `${weeklyChallenge.pointsReward} XP  ·  ${weeklyChallenge.starsReward} stars` : "Rewards coming Monday"}</AppText>
          </View>
        </View>
        <View style={styles.challengeHeading}><View><AppText style={styles.sectionTitle}>Available challenges</AppText><AppText style={styles.challengeHeadingCopy}>Live challenges for your grade.</AppText></View><AppText style={styles.challengeHeadingEmoji}>✨</AppText></View>
        <View style={styles.challengeModes}>
          {availableChallenges.map((challenge) => {
            const presentation = challengePresentation[challenge.type];
            const description = challenge.description || (challenge.type === "WEEKLY"
              ? "Play a game each weekday from Monday to Friday. Missing any weekday fails the streak."
              : `Answer ${challenge.targetQuestions} questions.`);
            const rewards = [
              ...(challenge.pointsReward > 0 ? [`${challenge.pointsReward} pts`] : []),
              ...(challenge.starsReward > 0 ? [`${challenge.starsReward} stars`] : []),
            ];
            return (
              <View key={challenge.id} style={[styles.modeCard, { backgroundColor: darkTheme ? "#1f2937" : presentation.background }, darkTheme && styles.darkCard]}>
                <View style={styles.modeTop}><AppText style={styles.modeEmoji}>{presentation.emoji}</AppText><AppText style={[styles.modeCategory, { color: presentation.accent }]}>{presentation.subtitle}</AppText></View>
                <AppText style={[styles.modeTitle, { color: presentation.accent }]}>{challenge.title}</AppText>
                <AppText style={[styles.modeCopy, darkTheme && styles.darkMutedText]}>{description}</AppText>
                <View style={styles.modeRewards}>{rewards.length ? rewards.map((reward) => <View key={reward} style={styles.modeReward}><AppText style={styles.modeRewardText}>{reward}</AppText></View>) : <AppText style={styles.noConfiguredReward}>No configured reward</AppText>}</View>
              </View>
            );
          })}
          {!availableChallenges.length && <View style={[styles.statusCard, darkTheme && styles.darkCard]}><AppText style={styles.statusEmoji}>🗓️</AppText><AppText style={[styles.statusTitle, darkTheme && styles.darkText]}>No other challenges yet</AppText><AppText style={[styles.statusCopy, darkTheme && styles.darkMutedText]}>New challenges for your grade will appear here.</AppText></View>}
        </View>
        <Pressable style={styles.leaderboardLink} onPress={() => { playPressSound(); router.push("/leaderboard"); }}><AppText style={styles.leaderboardEmoji}>🏅</AppText><View style={styles.leaderboardCopy}><AppText style={styles.leaderboardTitle}>Challenge leaderboard</AppText><AppText style={styles.leaderboardSubtitle}>See how you rank with other learners</AppText></View><AppText style={styles.leaderboardArrow}>→</AppText></Pressable>
        <View style={styles.encouragement}><AppText style={styles.encourageEmoji}>✨</AppText><AppText style={styles.encourageText}>Every challenge makes you a little brighter!</AppText><AppText style={styles.encourageEmoji}>✨</AppText></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  darkSafeArea: { backgroundColor: "#111827" },
  darkCard: { backgroundColor: "#1f2937", borderColor: "rgba(148,163,184,0.3)" },
  darkControl: { backgroundColor: "#374151", borderColor: "#4b5563" },
  darkText: { color: "#f8fafc" },
  darkMutedText: { color: "#cbd5e1" },
  safeArea: { flex: 1, backgroundColor: "#f8c25a" },
  backgroundGlow: { position: "absolute", top: -100, right: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(255, 247, 211, 0.42)" },
  backgroundGlowTwo: { position: "absolute", bottom: -120, left: -90, width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(255, 255, 255, 0.18)" },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 38, maxWidth: 720, width: "100%", alignSelf: "center", alignItems: "center" },
  header: { minHeight: 64, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { minWidth: 62, minHeight: 38, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "rgba(80, 54, 23, 0.16)" },
  backText: { color: "#503617", fontFamily: "FredokaBold", fontSize: 15 },
  headerSpacer: { width: 62 },
  title: { fontFamily: "FredokaBold", fontSize: 28, color: "#503617" },
  hero: { width: "100%", maxWidth: 520, backgroundColor: "rgba(255, 244, 208, 0.94)", borderWidth: 3, borderColor: "#f4b942", borderRadius: 28, padding: 20, overflow: "hidden", minHeight: 174, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", shadowColor: "#5b3218", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 9, elevation: 7 },
  heroCopy: { zIndex: 1 },
  heroEyebrow: { color: "#8a5a1d", letterSpacing: 1.3, fontFamily: "FredokaBold", fontSize: 10 },
  heroTitle: { color: "#503617", fontFamily: "FredokaBold", fontSize: 23, marginTop: 4 },
  heroSub: { color: "#6b4a28", fontFamily: "FredokaRegular", marginTop: 3, fontSize: 13 },
  gradeTag: { backgroundColor: "rgba(244,185,66,0.25)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start", marginTop: 12 },
  gradeText: { color: "#503617", fontFamily: "FredokaMedium", fontSize: 11 },
  mascot: { width: 92, height: 82, alignItems: "center", justifyContent: "center", position: "relative", marginRight: 6, marginTop: 0 },
  mascotImage: { width: 92, height: 82 },
  heroProgressRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  progressTrack: { height: 9, backgroundColor: "rgba(80,54,23,0.15)", borderRadius: 8, flex: 1, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.yellow, borderRadius: 8 },
  progressLabel: { color: "#503617", fontFamily: "FredokaBold", fontSize: 12 },
  rewardsRow: { width: "100%", maxWidth: 520, flexDirection: "row", gap: 8, marginTop: 13, marginBottom: 23 },
  reward: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(255,244,208,0.94)", borderWidth: 2, borderColor: "#f4b942", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 5 },
  rewardEmoji: { fontSize: 17 },
  rewardIcon: { width: 18, height: 18 },
  rewardAmount: { fontFamily: "FredokaBold", fontSize: 12, color: colors.ink },
  sectionHeading: { width: "100%", maxWidth: 520, flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 11 },
  sectionTitle: { color: "#503617", fontSize: 20, fontFamily: "FredokaBold", marginBottom: 11 },
  sectionHint: { fontFamily: "FredokaRegular", fontSize: 12, color: colors.muted },
  questionCard: { width: "100%", maxWidth: 520, backgroundColor: "rgba(255,244,208,0.96)", borderWidth: 3, borderColor: "#f4b942", borderRadius: 24, padding: 18, shadowColor: "#5b3218", shadowOpacity: 0.14, shadowRadius: 9, elevation: 5 },
  questionMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  questionNumber: { color: "#8a5a1d", fontFamily: "FredokaBold", letterSpacing: 1.1, fontSize: 10 },
  questionIcon: { fontSize: 19 },
  questionPrompt: { color: "#503617", fontFamily: "FredokaBold", fontSize: 23, marginTop: 11, marginBottom: 15 },
  questionMedia: { width: "100%", height: 170, marginBottom: 14 },
  inlineQuestionImage: { width: 64, height: 64, verticalAlign: "middle", marginHorizontal: 3 },
  statusCard: { width: "100%", maxWidth: 520, alignItems: "center", justifyContent: "center", padding: 24, borderRadius: 24, backgroundColor: "rgba(255,244,208,0.96)", borderWidth: 3, borderColor: "#f4b942" },
  statusEmoji: { fontSize: 34, marginBottom: 8 },
  statusTitle: { color: "#503617", fontFamily: "FredokaBold", fontSize: 18, textAlign: "center" },
  statusCopy: { color: "#6b4a28", fontFamily: "FredokaRegular", fontSize: 13, textAlign: "center", marginTop: 5 },
  answerList: { gap: 8 },
  answerButton: { borderWidth: 2, borderColor: "rgba(80,54,23,0.15)", backgroundColor: "rgba(255,255,255,0.58)", borderRadius: 14, minHeight: 48, flexDirection: "row", alignItems: "center", paddingHorizontal: 11 },
  correctAnswer: { borderColor: "#37875e", backgroundColor: "#e4f2df" },
  wrongAnswer: { borderColor: "#c95a43", backgroundColor: "#fce3d6" },
  answerLetter: { width: 27, height: 27, borderRadius: 9, backgroundColor: "rgba(80,54,23,0.1)", textAlign: "center", textAlignVertical: "center", overflow: "hidden", paddingTop: 4, marginRight: 10, color: colors.muted, fontFamily: "FredokaBold", fontSize: 12 },
  answerLetterActive: { backgroundColor: "#cfe5c8", color: "#286544" },
  answerText: { flex: 1, color: "#503617", fontFamily: "FredokaMedium", fontSize: 15 },
  answerCheck: { fontSize: 19, color: colors.green, fontFamily: "FredokaBold" },
  progressError: { color: "#a63427", fontFamily: "FredokaMedium", fontSize: 12, marginBottom: 10 },
  completionCard: { width: "100%", maxWidth: 520, backgroundColor: "rgba(255,244,208,0.96)", borderWidth: 3, borderColor: "#f4b942", borderRadius: 24, alignItems: "center", padding: 21 },
  completionEmoji: { fontSize: 48 },
  completionTitle: { color: "#503617", fontFamily: "FredokaBold", fontSize: 22, marginTop: 7 },
  completionCopy: { textAlign: "center", color: "#6b4a28", fontFamily: "FredokaRegular", marginTop: 6 },
  completionRewards: { flexDirection: "row", width: "100%", gap: 8, marginVertical: 17 },
  claimButton: { width: "100%", backgroundColor: "#f4b942", alignItems: "center", borderRadius: 14, padding: 13 },
  claimButtonClaimed: { backgroundColor: "#d9c89f", opacity: 0.9 },
  claimText: { color: "#503617", fontFamily: "FredokaBold", fontSize: 15 },
  weeklyCard: { width: "100%", maxWidth: 520, backgroundColor: "rgba(255,244,208,0.96)", borderWidth: 3, borderColor: "#f4b942", borderRadius: 24, padding: 16, marginTop: 18, marginBottom: 24, shadowColor: "#5b3218", shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  weeklyTop: { flexDirection: "row", alignItems: "center" },
  weeklyIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "rgba(244,185,66,0.32)", alignItems: "center", justifyContent: "center", marginRight: 11 },
  trophy: { fontSize: 24 },
  weeklyCopy: { flex: 1 },
  weeklyTitle: { color: "#503617", fontFamily: "FredokaBold", fontSize: 16 },
  weeklySubtitle: { color: "#6b4a28", fontFamily: "FredokaRegular", fontSize: 11, marginTop: 2 },
  weeklyCount: { color: colors.purple, fontFamily: "FredokaBold", fontSize: 15 },
  weeklyFailedText: { color: "#bf4f43", fontSize: 11 },
  weekDots: { flexDirection: "row", gap: 8, marginTop: 15, marginBottom: 13 },
  weekDay: { flex: 1, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#F4F2F8" },
  weekDayDone: { backgroundColor: "#E7F7EE" },
  weekDayFailed: { backgroundColor: "#FCE3D6" },
  weekDayText: { fontFamily: "FredokaMedium", color: "#A5A2B3", fontSize: 12 },
  weekDayCheck: { width: 18, height: 18 },
  weekDayTextFailed: { color: "#bf4f43", fontFamily: "FredokaBold" },
  weeklyReward: { borderRadius: 12, backgroundColor: "rgba(244,185,66,0.22)", padding: 11, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  weeklyRewardText: { color: "#8a5a1d", fontFamily: "FredokaBold", fontSize: 10, letterSpacing: 0.6 },
  weeklyRewardValue: { color: "#6b4a28", fontFamily: "FredokaMedium", fontSize: 11 },
  challengeHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  challengeHeadingCopy: { color: "#6b4a28", fontFamily: "FredokaRegular", fontSize: 12, marginTop: -6, marginBottom: 12 },
  challengeHeadingEmoji: { fontSize: 23, marginBottom: 16 },
  challengeModes: { width: "100%", maxWidth: 520, flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
  modeCard: { width: "48%", minWidth: 150, flexGrow: 1, borderRadius: 18, padding: 14, minHeight: 168, borderWidth: 2, borderColor: "rgba(80,54,23,0.12)", shadowColor: "#5b3218", shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  modeTop: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 31 },
  modeEmoji: { fontSize: 22 },
  modeCategory: { fontFamily: "FredokaMedium", fontSize: 10, flexShrink: 1 },
  modeTitle: { fontFamily: "FredokaBold", fontSize: 15, letterSpacing: 0.6, marginTop: 7 },
  modeCopy: { fontFamily: "FredokaRegular", color: "#503617", fontSize: 12, lineHeight: 17, marginTop: 4, flexGrow: 1 },
  modeRewards: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  modeReward: { backgroundColor: "rgba(255,255,255,0.64)", borderRadius: 10, paddingVertical: 5, paddingHorizontal: 8, borderWidth: 1, borderColor: "rgba(80,54,23,0.12)" },
  modeRewardText: { fontFamily: "FredokaBold", color: "#503617", fontSize: 12 },
  noConfiguredReward: { color: "#6b4a28", fontFamily: "FredokaRegular", fontSize: 11 },
  leaderboardLink: { width: "100%", maxWidth: 520, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,244,208,0.94)", borderWidth: 2, borderColor: "#f4b942", borderRadius: 20, padding: 14, marginTop: 12 },
  leaderboardEmoji: { fontSize: 25, marginRight: 12 },
  leaderboardCopy: { flex: 1 },
  leaderboardTitle: { color: "#503617", fontFamily: "FredokaBold", fontSize: 14 },
  leaderboardSubtitle: { color: "#6b4a28", fontFamily: "FredokaRegular", fontSize: 11, marginTop: 2 },
  leaderboardArrow: { color: "#8a5a1d", fontFamily: "FredokaBold", fontSize: 23 },
  encouragement: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9, paddingVertical: 23 },
  encourageEmoji: { color: "#8a5a1d" },
  encourageText: { color: "#6b4a28", fontFamily: "FredokaMedium", fontSize: 12 },
});
