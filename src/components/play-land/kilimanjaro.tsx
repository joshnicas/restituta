import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayer } from "expo-audio";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Image,
  ImageBackground,
  ImageSourcePropType,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getAllUserGifts,
  getCurrentAuthToken,
  getGrades,
  getLevelQuestions,
  getMySubscription,
  getUserChallenges,
  getUserGameProfile,
  getUserLevelProgress,
  getUserMe,
  postQuestionAttempt,
  postUserLevelProgress,
  updateUserLevelProgress,
  type GameQuestion
} from "../../lib/api";
import { useAudioPreferences } from "../../lib/audio-preferences";
import { API_BASE } from "../../lib/config";
import { getKidoLanguage } from "../../lib/language-preferences";
import { getPlayLandErrorMessage, isNetworkError, NO_INTERNET_MESSAGE } from "../../lib/network-errors";
import { consumePlayerLife, loadPlayerLives, recoverPlayerLives, savePlayerLives, type PlayerLivesState } from "../../lib/player-lives";
import AppText from "../app-text";
import Answers from "./play-land-components/answers";
import Overview from "./play-land-components/overview";
import ProfileGradeCard from "./play-land-components/profile-grade-card";
import QuestionPanel from "./play-land-components/question-panel";
import ResetBar from "./play-land-components/reset-bar";
import SubjectLevelCard from "./play-land-components/subject-level-card";
import Subjects, { type CurrentLevel } from "./play-land-components/subjects";
import Timer from "./play-land-components/timer";
import TopRightBar from "./play-land-components/top-right-bar";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const QUESTION_LOADING_MESSAGES = [
  "Gathering your next questions…",
  "Waking up the quiz trail…",
  "Almost ready, sharpen those pencils!",
];

type KilimanjaroProps = {
  selectedPlayer?: 1 | 2;
  onOverviewVisibilityChange?: (visible: boolean) => void;
  onRoundStart?: (started: boolean) => void;
  backgroundSource?: ImageSourcePropType;
  panelSource?: ImageSourcePropType;
  blinkEyesSource?: ImageSourcePropType;
  blinkEyesScale?: number;
  answerBoardSource?: ImageSourcePropType;
  panelHeightScale?: number;
  timerSource?: ImageSourcePropType;
  timerScale?: number;
  timerContentOffsetY?: number;
  panelScale?: number;
  panelOffsetY?: number;
  panelContentOffsetY?: number;
  showTreeAndBranch?: boolean;
};

type PlayableQuestion = {
  id: string;
  type: "multiple-choice" | "true-false" | "image-choice";
  question: string;
  answers: string[];
  correct: string;
  image?: { uri: string };
  questionImages?: Array<{ uri: string }>;
  options?: Array<{ uri: string } | undefined>;
  timeLimit?: number | null;
};

type LevelProgressSnapshot = {
  gameLevelId: string | number;
  bestScore: number;
  attempts: number;
  stars: number;
  completed: boolean;
  passAttempts: number;
  pendingXp: number;
  pendingStars: number;
};

const toAssetSource = (url?: string | null) => {
  if (!url) return undefined;
  return { uri: /^https?:\/\//i.test(url) ? url : `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}` };
};

const getUserPayload = (response: any) =>
  response?.user ?? response?.data?.user ?? response?.data ?? response;

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[nextIndex]] = [result[nextIndex], result[index]];
  }
  return result;
};

const XP_PER_CORRECT_ANSWER = 10;
const popSound = require("../../assets/sound.effects/pop.mp3");
const correctAnswerSound = require("../../assets/sound.effects/correct.mp3");
const wrongAnswerSound = require("../../assets/sound.effects/wrong.mp3");
const FREE_LEVEL_USED_KEY = "kido.freeLevelId";

const toPlayableQuestion = (question: GameQuestion, language: "EN" | "SW" = "EN"): PlayableQuestion | null => {
  const code = question.gameType.code.toUpperCase();
  const images = question.media
    .filter((media) => media.type === "IMAGE")
    .sort((left, right) => left.order - right.order)
    .map((media) => toAssetSource(media.url))
    .filter((source): source is { uri: string } => Boolean(source));
  const prompt = question.text.trim();

  if (code === "TRUE_FALSE" && question.trueFalseAnswer !== null && question.trueFalseAnswer !== undefined) {
    const answers = language === "SW" ? ["Kweli", "Si kweli"] : ["True", "False"];
    return {
      id: question.id,
      type: "true-false",
      question: prompt,
      answers,
      correct: question.trueFalseAnswer ? answers[0] : answers[1],
      image: images[0],
      timeLimit: question.timeLimit,
    };
  }

  if (code !== "MULTIPLE_CHOICE" && code !== "IMAGE_CHOICE") return null;
  const options = [...question.options].sort((left, right) => left.order - right.order);
  const answers = options.map((option) => option.text?.trim() || option.id);
  const correctIndex = options.findIndex((option) => option.isCorrect);
  if (options.length < 2 || correctIndex < 0) return null;
  const imageOptions = options.map((option) => toAssetSource(option.image));
  const hasImagesForEveryOption = imageOptions.every((source) => source !== undefined);
  const isImageChoice = code === "IMAGE_CHOICE" && hasImagesForEveryOption;

  return {
    id: question.id,
    type: isImageChoice ? "image-choice" : "multiple-choice",
    question: prompt,
    answers,
    correct: answers[correctIndex],
    image: images[0],
    questionImages: images.length > 0 ? images : undefined,
    options: isImageChoice ? imageOptions as Array<{ uri: string }> : undefined,
    timeLimit: question.timeLimit,
  };
};

export default function Kilimanjaro({
  selectedPlayer = 2,
  onOverviewVisibilityChange,
  onRoundStart,
  backgroundSource: customBackgroundSource,
  panelSource,
  blinkEyesSource,
  blinkEyesScale,
  answerBoardSource,
  panelHeightScale = 1,
  timerSource,
  timerScale = 1,
  timerContentOffsetY = 0,
  panelScale = 1,
  panelOffsetY = 0,
  panelContentOffsetY = 0,
  showTreeAndBranch = true,
}: KilimanjaroProps = {}) {
  const router = useRouter();
  const { soundEnabled, preferencesLoaded } = useAudioPreferences();
  const popPlayer = useAudioPlayer(popSound);
  const correctAnswerPlayer = useAudioPlayer(correctAnswerSound);
  const wrongAnswerPlayer = useAudioPlayer(wrongAnswerSound);
  const playPopSound = () => {
    if (!preferencesLoaded || !soundEnabled) return;
    try {
      popPlayer.seekTo(0);
      popPlayer.play();
    } catch {
      // ignore
    }
  };

  const playAnswerSound = (isCorrect: boolean) => {
    if (!preferencesLoaded || !soundEnabled) return;
    const player = isCorrect ? correctAnswerPlayer : wrongAnswerPlayer;
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // ignore
    }
  };
  useEffect(() => {
    if (preferencesLoaded && soundEnabled) return;
    try {
      popPlayer.pause();
      correctAnswerPlayer.pause();
      wrongAnswerPlayer.pause();
    } catch {
      // Ignore transient audio playback issues while preferences load or change.
    }
  }, [correctAnswerPlayer, popPlayer, preferencesLoaded, soundEnabled, wrongAnswerPlayer]);
  const [isStarted, setIsStarted] = useState(false);
  const [showSubjectSelector, setShowSubjectSelector] = useState(true);
  const [showRoundStart, setShowRoundStart] = useState(false);
  const [subjectLevelDetailsVisible, setSubjectLevelDetailsVisible] = useState(false);
  const [quitConfirmationVisible, setQuitConfirmationVisible] = useState(false);
  const [subjectSelectorEntranceDirection, setSubjectSelectorEntranceDirection] = useState<"left" | "right">("right");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedLevelPointsRequired, setSelectedLevelPointsRequired] = useState(0);
  const [selectedLevelTimeLimit, setSelectedLevelTimeLimit] = useState(0);
  const [selectedLevelPointsAcquired, setSelectedLevelPointsAcquired] = useState(0);
  const [questions, setQuestions] = useState<PlayableQuestion[]>([]);
  const [timerRoundKey, setTimerRoundKey] = useState(0);
  const questionPoolRef = useRef<PlayableQuestion[]>([]);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [networkUnavailable, setNetworkUnavailable] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [lastTimeLeft, setLastTimeLeft] = useState<number | null>(null);
  const [gradeName, setGradeName] = useState("");
  const [gradeId, setGradeId] = useState<string | number | null>(null);
  const [xp, setXp] = useState(0);
  const [stars, setStars] = useState(0);
  const [lives, setLives] = useState(3);
  const [livesReady, setLivesReady] = useState(false);
  const [nextLifeAt, setNextLifeAt] = useState<string | null>(null);
  const nextLifeAtRef = useRef<string | null>(null);
  const livesRef = useRef(3);
  const [lifeCountdown, setLifeCountdown] = useState("01:00");
  const [levelAttemptMessage, setLevelAttemptMessage] = useState<string | null>(null);
  const [subscriptionPromptVisible, setSubscriptionPromptVisible] = useState(false);
  const [subscriptionCheckLoading, setSubscriptionCheckLoading] = useState(false);
  const [subscriptionGateMessage, setSubscriptionGateMessage] = useState("");
  const hasMounted = useRef(false);
  const progressRecordRef = useRef<LevelProgressSnapshot | null>(null);
  const roundProgressBeforeRef = useRef<LevelProgressSnapshot | null>(null);
  const progressSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const progressPreparationRef = useRef<Promise<void> | null>(null);
  const roundSequenceRef = useRef(0);
  const savedRoundSequenceRef = useRef(0);
  const pendingRoundStartRef = useRef(false);
  const recordedAttemptKeysRef = useRef(new Set<string>());
  const pendingAttemptWritesRef = useRef(new Set<Promise<void>>());
  const panelDrop = useRef(new Animated.Value(-1200)).current;
  const branchShake = useRef(new Animated.Value(0)).current;
  const answerReveal = useRef(new Animated.Value(0)).current;
  const startButtonBounce = useRef(new Animated.Value(0)).current;
  const backArrowPoint = useRef(new Animated.Value(0)).current;
  const roundStartSlide = useRef(new Animated.Value(0)).current;
  const questionLoadingSlide = useRef(new Animated.Value(0)).current;
  const questionLoadingPulse = useRef(new Animated.Value(0)).current;
  const questionLoadingDotPulses = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const syncLives = (state: PlayerLivesState) => {
    const safeState = recoverPlayerLives(state);
    livesRef.current = safeState.lives;
    nextLifeAtRef.current = safeState.nextLifeAt;
    setLives(safeState.lives);
    setLivesReady(true);
    setNextLifeAt(safeState.nextLifeAt);
  };

  const refreshLives = useCallback(async () => {
    try {
      const userKey = await AsyncStorage.getItem("kido.numericUserId")
        ?? await AsyncStorage.getItem("kido.userId")
        ?? "guest";
      syncLives(await loadPlayerLives(userKey));
      setNetworkUnavailable(false);
    } catch {
      // Storage may be unavailable temporarily; leave current in-memory lives intact.
      setLivesReady(true);
    }
  }, []);

  const refreshProfileTotals = useCallback(async (
    isActive: () => boolean = () => true,
    knownUserId?: number,
  ) => {
    try {
      const [cachedXp, cachedStars, cachedUserId] = await AsyncStorage.multiGet([
        "kido.xp",
        "kido.stars",
        "kido.numericUserId",
      ]);
      if (isActive()) {
        setXp(Number(cachedXp[1]) || 0);
        setStars(Number(cachedStars[1]) || 0);
      }

      const userId = knownUserId ?? Number(cachedUserId[1]);
      if (!Number.isFinite(userId) || userId <= 0) return;

      const response = await getUserGameProfile(userId);
      const profileXp = Number(response?.profile?.xp);
      const profileStars = Number(response?.profile?.stars);
      if (!Number.isFinite(profileXp) || !Number.isFinite(profileStars) || !isActive()) return;

      setXp(profileXp);
      setStars(profileStars);
      setNetworkUnavailable(false);
      await AsyncStorage.multiSet([
        ["kido.numericUserId", String(userId)],
        ["kido.xp", String(profileXp)],
        ["kido.stars", String(profileStars)],
      ]);
    } catch (error) {
      if (isNetworkError(error)) setNetworkUnavailable(true);
      // Keep the cached totals visible when the profile cannot be refreshed.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshLives();
      let active = true;
      void refreshProfileTotals(() => active);
      return () => { active = false; };
    }, [refreshLives, refreshProfileTotals]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshLives();
        void refreshProfileTotals();
      }
    });
    return () => subscription.remove();
  }, [refreshLives, refreshProfileTotals]);

  useEffect(() => {
    if (!nextLifeAt) return;
    const updateCountdown = () => {
      const remaining = Math.max(0, new Date(nextLifeAt).getTime() - Date.now());
      const totalSeconds = Math.ceil(remaining / 1000);
      setLifeCountdown(`${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`);
      if (remaining === 0 && livesRef.current < 3) {
        const nextState = recoverPlayerLives({ lives: livesRef.current, nextLifeAt });
        if (nextState.lives !== livesRef.current || nextState.nextLifeAt !== nextLifeAt) {
          syncLives(nextState);
          void AsyncStorage.getItem("kido.numericUserId")
            .then(async (numericId) => numericId ?? await AsyncStorage.getItem("kido.userId") ?? "guest")
            .then((userKey) => savePlayerLives(userKey, nextState))
            .catch(() => undefined);
        }
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [nextLifeAt]);

  useEffect(() => {
    if (lives >= 3) {
      setLifeCountdown("01:00");
      return;
    }
    if (!nextLifeAt) {
      setLifeCountdown("01:00");
      return;
    }
    const remaining = Math.max(0, new Date(nextLifeAt).getTime() - Date.now());
    const totalSeconds = Math.ceil(remaining / 1000);
    setLifeCountdown(`${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`);
  }, [lives, nextLifeAt]);

  useEffect(() => {
    onOverviewVisibilityChange?.(quizFinished);
  }, [onOverviewVisibilityChange, quizFinished]);

  const isWeb = Platform.OS === "web";
  const { width: windowWidth } = useWindowDimensions();
  const compactWebProfile = isWeb && windowWidth <= 768;
  const backgroundSource =
    customBackgroundSource ??
    (isWeb
      ? require("../../assets/lands/kilimanjaro-web.png")
      : require("../../assets/lands/kilimanjaro.png"));
  const webLayerStyles = isWeb
    ? {
        tree: {
          left: -20,
          bottom: -260,
          width: 700,
          height: 1320,
        },
        branch: {
          left: 60,
          bottom: -60,
          width: 700,
          height: 1080,
        },
        questionPanel: {
          left: 20,
          bottom: 20,
          width: 970,
          height: 1080,
        },
      }
    : {};

  useEffect(() => {
    let cancelled = false;
    void refreshProfileTotals(() => !cancelled);

    const loadGradeName = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("kido.authToken");
        const token = storedToken ?? await getCurrentAuthToken();

        if (token && token !== storedToken) {
          await AsyncStorage.setItem("kido.authToken", String(token));
        }

        if (!token) {
          const [cachedGradeId, cachedGradeName, cachedXp, cachedStars] = await AsyncStorage.multiGet([
            "kido.gradeId",
            "kido.gradeName",
            "kido.xp",
            "kido.stars",
          ]);
          if (!cancelled) {
            setGradeId(cachedGradeId[1] || null);
            setGradeName(cachedGradeName[1] || "");
            setXp(Number(cachedXp[1]) || 0);
            setStars(Number(cachedStars[1]) || 0);
          }
          return;
        }

        const user = getUserPayload(await getUserMe(token));
        const userGradeId = user?.gradeId ?? user?.grade?.id;
        const numericUserId = Number(user?.id ?? await AsyncStorage.getItem("kido.numericUserId"));
        if (Number.isFinite(numericUserId) && numericUserId > 0) {
          await AsyncStorage.setItem("kido.numericUserId", String(numericUserId));
          void refreshProfileTotals(() => !cancelled, numericUserId);
        }
        let name = String(user?.grade?.name ?? "");

        if (!name && userGradeId !== undefined && userGradeId !== null) {
          const response = await getGrades();
          const grades = Array.isArray(response)
            ? response
            : response?.grades || [];
          const matchingGrade = grades.find(
            (grade: { id: number | string; name: string }) =>
              String(grade.id) === String(userGradeId),
          );
          name = String(matchingGrade?.name ?? "");
        }

        if (!cancelled) {
          setGradeId(userGradeId ?? null);
          setGradeName(name);
          await AsyncStorage.setItem("kido.userProfile", JSON.stringify(user));
          await AsyncStorage.multiSet([
            ["kido.gradeId", String(userGradeId ?? "")],
            ["kido.gradeName", name],
          ]);
        }
      } catch (error) {
        if (isNetworkError(error)) setNetworkUnavailable(true);
        // Use cached profile data when the network is temporarily unavailable.
        const [cachedProfile, cachedGradeId, cachedGradeName] =
          await AsyncStorage.multiGet([
            "kido.userProfile",
            "kido.gradeId",
            "kido.gradeName",
          ]);
        let cachedUser: any = null;
        try {
          cachedUser = cachedProfile[1] ? JSON.parse(cachedProfile[1]) : null;
        } catch {
          cachedUser = null;
        }
        if (!cancelled) {
          setGradeId(
            cachedUser?.gradeId ?? cachedUser?.grade?.id ?? cachedGradeId[1] ?? null,
          );
          setGradeName(
            String(cachedUser?.grade?.name ?? cachedGradeName[1] ?? ""),
          );
        }
      }
    };

    void loadGradeName();

    return () => {
      cancelled = true;
    };
  }, [refreshProfileTotals]);

  const timerDuration = questions.reduce(
    (total, question) =>
      total +
      (typeof question.timeLimit === "number" && question.timeLimit > 0
        ? question.timeLimit
        : 60),
    0,
  ) || 60;

  const attemptOutcome = (() => {
    const before = roundProgressBeforeRef.current;
    if (!before) return undefined;
    const potentialScore =
      before.bestScore + before.pendingXp + correctCount * XP_PER_CORRECT_ANSWER;
    if (before.completed || potentialScore >= selectedLevelPointsRequired) return "passed" as const;
    return before.passAttempts + 1 >= 2 ? "fresh-start" as const : "second-attempt" as const;
  })();

  const attemptPrompt =
    attemptOutcome === "passed"
      ? "You reached the XP target and unlocked your rewards. Choose your next challenge!"
      : attemptOutcome === "second-attempt"
        ? "So close! Your XP and stars are waiting. Take one more round and reach the target!"
        : attemptOutcome === "fresh-start"
          ? "Two brave tries completed! Start a fresh run and keep building your skills toward the goal."
          : levelAttemptMessage ?? undefined;

  const attemptActionLabel =
    attemptOutcome === "second-attempt"
      ? "Play attempt 2"
      : attemptOutcome === "fresh-start"
        ? "Try again"
        : "Continue";

  useEffect(() => {
    if (!quizFinished) return;
    let cancelled = false;
    const savingRoundSequence = roundSequenceRef.current;
    const previousSave = progressSavePromiseRef.current;

    const updateProgress = async (): Promise<boolean> => {
      try {
        await previousSave?.catch(() => false);
        await progressPreparationRef.current;
        const existing = progressRecordRef.current;
        if (!existing) return false;
        const token = await AsyncStorage.getItem("kido.authToken");
        if (!token) throw new Error("Authentication expired while saving level progress.");
        const xpEarned = correctCount * XP_PER_CORRECT_ANSWER;
        const earnedStars = (() => {
          const tried = correctCount + wrongCount > 0;
          const roundCompleted = correctCount + wrongCount >= questions.length;
          const fastAccurate = roundCompleted && correctCount / Math.max(questions.length, 1) >= 0.8 && (lastTimeLeft ?? 0) >= timerDuration * 0.25;
          const perfect = roundCompleted && correctCount === questions.length;
          return Number(tried) + Number(fastAccurate) + Number(perfect);
        })();
        const updateResponse: any = await updateUserLevelProgress(existing.gameLevelId, {
          gameLevelId: Number(existing.gameLevelId),
          ...(gradeId !== null ? { gradeId: Number(gradeId) } : {}),
          px: xpEarned,
          stars: earnedStars,
        }, token);
        const savedProgress = updateResponse?.progress ?? updateResponse?.data?.progress ?? updateResponse;
        const updatedProgress: LevelProgressSnapshot = {
          ...existing,
          bestScore: Number(savedProgress?.bestScore ?? existing.bestScore),
          attempts: Number(savedProgress?.attempts ?? existing.attempts + 1),
          stars: Number(savedProgress?.stars ?? existing.stars),
          completed: savedProgress?.completed === true,
          passAttempts: Number(savedProgress?.passAttempts ?? 0),
          pendingXp: Number(savedProgress?.pendingXp ?? 0),
          pendingStars: Number(savedProgress?.pendingStars ?? 0),
        };
        progressRecordRef.current = updatedProgress;
        savedRoundSequenceRef.current = Math.max(savedRoundSequenceRef.current, savingRoundSequence);
        if (roundSequenceRef.current > savingRoundSequence) {
          roundProgressBeforeRef.current = { ...updatedProgress };
        }
        if (!cancelled) {
          setLevelAttemptMessage(
            savedProgress?.completed === true
              ? "Required XP reached. This level's rewards are now included in your totals."
              : savedProgress?.attemptWindowFailed === true
                ? "The target was missed in both attempts. XP and stars from those attempts were not added. You can try again."
                : `Attempt ${existing.passAttempts + 1} of 2. XP and stars from these attempts count only after reaching the target.`,
          );
        }
        try {
            const storedNumericId = Number(await AsyncStorage.getItem("kido.numericUserId"));
            const [updatedProgressResponse, challengeResponse, giftRecords, profileResponse]: [any, any, any[], any] = await Promise.all([
              getUserLevelProgress(token),
              getUserChallenges(token),
              Number.isFinite(storedNumericId) && storedNumericId > 0
                ? getAllUserGifts(storedNumericId, token).catch(() => [])
                : Promise.resolve([]),
              Number.isFinite(storedNumericId) && storedNumericId > 0
                ? getUserGameProfile(storedNumericId).catch(() => null)
                : Promise.resolve(null),
            ]);
            const progressRecords = Array.isArray(updatedProgressResponse)
              ? updatedProgressResponse
              : updatedProgressResponse?.progress ??
                updatedProgressResponse?.progresses ??
                updatedProgressResponse?.data?.progress ??
                updatedProgressResponse?.data?.progresses ??
                updatedProgressResponse?.data ??
                [];
            const challengeRecords = Array.isArray(challengeResponse)
              ? challengeResponse
              : challengeResponse?.userChallenges ??
                challengeResponse?.data?.userChallenges ??
                [];
            const totalXp = [
              ...(Array.isArray(progressRecords) ? progressRecords.map((record: any) => Number(record?.bestScore ?? record?.score ?? record?.px ?? 0)) : []),
              ...(Array.isArray(challengeRecords) ? challengeRecords.map((record: any) => record?.claimed === true ? Number(record?.pointsEarned ?? 0) : 0) : []),
              ...giftRecords.map((record) => Number(record?.gift?.pointsAwarded ?? 0)),
            ].reduce((total, value) => total + value, 0);
            const totalStars = [
              ...(Array.isArray(progressRecords) ? progressRecords.map((record: any) => Number(record?.stars ?? 0)) : []),
              ...(Array.isArray(challengeRecords) ? challengeRecords.map((record: any) => record?.claimed === true ? Number(record?.starsEarned ?? 0) : 0) : []),
              ...giftRecords.map((record) => Number(record?.gift?.starsAwarded ?? 0)),
            ].reduce((total, value) => total + value, 0);
            const profile = profileResponse?.profile;
            const overallXp = Number.isFinite(Number(profile?.xp)) ? Number(profile.xp) : totalXp;
            const overallStars = Number.isFinite(Number(profile?.stars)) ? Number(profile.stars) : totalStars;
            if (!cancelled) {
              setXp(overallXp);
              setStars(overallStars);
              await AsyncStorage.multiSet([
                ["kido.xp", String(overallXp)],
                ["kido.stars", String(overallStars)],
              ]);
            }
        } catch (error) {
          if (isNetworkError(error)) setNetworkUnavailable(true);
          // The level reward has already saved; keep the current totals if refresh fails.
        }
        return true;
      } catch (error) {
        if (isNetworkError(error)) setNetworkUnavailable(true);
        if (!cancelled) {
          setRoundError(getPlayLandErrorMessage(error, "Could not save level progress."));
        }
        return false;
      }
    };

    progressSavePromiseRef.current = updateProgress();
    void progressSavePromiseRef.current;
    return () => { cancelled = true; };
  }, [quizFinished]);

  useEffect(() => {
    if (!showRoundStart) {
      startButtonBounce.stopAnimation();
      startButtonBounce.setValue(0);
      return;
    }

    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(startButtonBounce, {
          toValue: -10,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.spring(startButtonBounce, {
          toValue: 0,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    );

    bounce.start();

    return () => {
      bounce.stop();
      startButtonBounce.setValue(0);
    };
  }, [showRoundStart, startButtonBounce]);

  useEffect(() => {
    backArrowPoint.stopAnimation();
    backArrowPoint.setValue(0);
    if (!showRoundStart) return;

    const pointLeft = Animated.loop(
      Animated.sequence([
        Animated.timing(backArrowPoint, {
          toValue: -5,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(backArrowPoint, {
          toValue: 0,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.delay(450),
      ]),
    );
    pointLeft.start();

    return () => {
      pointLeft.stop();
      backArrowPoint.setValue(0);
    };
  }, [backArrowPoint, showRoundStart]);

  useEffect(() => {
    roundStartSlide.stopAnimation();
    roundStartSlide.setValue(0);
    if (!showRoundStart) return;

    const slideIn = Animated.timing(roundStartSlide, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    });
    slideIn.start();
    return () => slideIn.stop();
  }, [roundStartSlide, showRoundStart]);

  useEffect(() => {
    questionLoadingSlide.stopAnimation();
    questionLoadingSlide.setValue(0);
    if (!isLoadingQuestions) return;

    const slideIn = Animated.timing(questionLoadingSlide, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    });
    slideIn.start();
    return () => slideIn.stop();
  }, [isLoadingQuestions, questionLoadingSlide]);

  useEffect(() => {
    questionLoadingPulse.stopAnimation();
    questionLoadingPulse.setValue(0);
    if (!isLoadingQuestions) {
      setLoadingMessageIndex(0);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(questionLoadingPulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(questionLoadingPulse, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    const dotPulse = Animated.loop(
      Animated.stagger(
        150,
        questionLoadingDotPulses.map((dot) =>
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: 240, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 340, useNativeDriver: true }),
          ]),
        ),
      ),
    );
    dotPulse.start();
    const messageTimer = setInterval(() => {
      setLoadingMessageIndex((index) => (index + 1) % QUESTION_LOADING_MESSAGES.length);
    }, 2200);

    return () => {
      pulse.stop();
      dotPulse.stop();
      questionLoadingDotPulses.forEach((dot) => dot.setValue(0));
      clearInterval(messageTimer);
    };
  }, [isLoadingQuestions, questionLoadingDotPulses, questionLoadingPulse]);

  const prepareLevelProgress = async (gameLevelId: string | number) => {
    const numericGameLevelId = Number(gameLevelId);
    if (!Number.isFinite(numericGameLevelId)) {
      throw new Error("This level has an invalid ID.");
    }
    const token = await getCurrentAuthToken();
    if (!token) throw new Error("Log in before starting a level.");

    const response: any = await getUserLevelProgress(token);
    const records = Array.isArray(response)
      ? response
      : response?.progress ?? response?.progresses ?? response?.data?.progress ?? response?.data?.progresses ?? response?.data ?? [];
    const existing = (Array.isArray(records) ? records : []).find(
      (record: any) => Number(record?.gameLevelId ?? record?.levelId) === numericGameLevelId,
    );

    const initialProgress = {
      gameLevelId: numericGameLevelId,
      ...(gradeId !== null ? { gradeId: Number(gradeId) } : {}),
      completed: existing?.completed === true,
      px: Number(existing?.px ?? 0),
      stars: Number(existing?.stars ?? 0),
      bestScore: Number(existing?.bestScore ?? existing?.px ?? 0),
      attempts: Number(existing?.attempts ?? 0),
    };

    if (!existing) {
      await postUserLevelProgress(initialProgress, token);
    }
    progressRecordRef.current = {
      gameLevelId: numericGameLevelId,
      bestScore: initialProgress.bestScore,
      attempts: initialProgress.attempts,
      stars: initialProgress.stars,
      completed: initialProgress.completed,
      passAttempts: Number(existing?.passAttempts ?? 0),
      pendingXp: Number(existing?.pendingXp ?? 0),
      pendingStars: Number(existing?.pendingStars ?? 0),
    };
  };

  const resetRoundStats = () => {
    setQuizFinished(false);
    setCorrectCount(0);
    setWrongCount(0);
    setCurrentQuestionIndex(0);
    setFeedback(null);
    setLastTimeLeft(null);
    setLevelAttemptMessage(null);
  };

  const loadRound = async (levelId: string | number) => {
    try {
      setIsLoadingQuestions(true);
      setRoundError(null);
      const language = await getKidoLanguage();
      const response = await getLevelQuestions(levelId, language, 10);
      setNetworkUnavailable(false);
      if (String(response?.level?.id) !== String(levelId)) {
        throw new Error("Questions were returned for a different level.");
      }
      if (
        !Array.isArray(response?.questions) ||
        response.questions.some((question) => String(question.gameLevelId) !== String(levelId))
      ) {
        throw new Error("Some questions don't belong to this level.");
      }
      const playable = response.questions
        .filter((question) => question.active !== false)
        .map((question) => toPlayableQuestion(question, language))
        .filter((question): question is PlayableQuestion => question !== null);
      const selected = shuffle(playable).slice(0, 10);
      if (selected.length === 0) {
        questionPoolRef.current = [];
        setQuestions([]);
        setRoundError("No questions are available for this level.");
        return false;
      }
      questionPoolRef.current = selected;
      setQuestions(shuffle(selected.slice(0, 5)));
      setTimerRoundKey((key) => key + 1);
      recordedAttemptKeysRef.current.clear();
      resetRoundStats();
      return true;
    } catch (error) {
      questionPoolRef.current = [];
      setQuestions([]);
      if (isNetworkError(error)) setNetworkUnavailable(true);
      setRoundError(getPlayLandErrorMessage(error, "Could not load questions for this level."));
      return false;
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const startSubjectLevel = async (
    subject: string,
    level: CurrentLevel,
  ) => {
    if (
      !level.id ||
      !Number.isFinite(Number(level.id)) ||
      Number(level.id) <= 0 ||
      !Number.isFinite(Number(level.gradeSubjectId)) ||
      Number(level.gradeSubjectId) <= 0
    ) {
      setRoundError("This subject's current level is unavailable. Please try again.");
      return;
    }

    pendingRoundStartRef.current = false;
    setSubscriptionCheckLoading(true);
    try {
      const userKey = await AsyncStorage.getItem("kido.numericUserId") ?? await AsyncStorage.getItem("kido.userId") ?? "guest";
      const freeLevelId = await AsyncStorage.getItem(`${FREE_LEVEL_USED_KEY}:${userKey}`);
      const token = await AsyncStorage.getItem("kido.authToken");
      if (freeLevelId && freeLevelId !== String(level.id)) {
        if (!token) {
          setSubscriptionGateMessage("Your free level has been used. Subscribe to continue playing.");
          setSubscriptionPromptVisible(true);
          return;
        }
        const subscription = await getMySubscription(token);
        if (!subscription.hasActiveSubscription) {
          setSubscriptionGateMessage("Your free level has been used. Subscribe to continue playing.");
          setSubscriptionPromptVisible(true);
          return;
        }
      }
    } catch {
      setSubscriptionGateMessage("We couldn’t check your subscription. Check your connection and try again.");
      setSubscriptionPromptVisible(true);
      return;
    } finally {
      setSubscriptionCheckLoading(false);
    }

    playPopSound();
    setSelectedSubject(subject);
    setSelectedLevel(level.levelNumber);
    setSelectedLevelPointsRequired(level.pointsRequired);
    setSelectedLevelTimeLimit(level.timeLimit);
    setSelectedLevelPointsAcquired(level.pointsAcquired);
    setRoundError(null);
    setSubjectSelectorEntranceDirection("right");
    setShowSubjectSelector(false);
    setShowRoundStart(false);
    setIsStarted(false);
    progressRecordRef.current = null;
    progressPreparationRef.current = prepareLevelProgress(level.id).catch((error) => {
      if (isNetworkError(error)) setNetworkUnavailable(true);
      setRoundError(getPlayLandErrorMessage(error, "Could not prepare level progress."));
    });

    const loaded = await loadRound(level.id);
    if (loaded) {
      setShowRoundStart(true);
    }
  };

  useEffect(() => {
    if (!isStarted) {
      if (quizFinished) {
        return;
      }
      if (!showRoundStart) {
        panelDrop.setValue(-1200);
      }
      branchShake.setValue(0);
      answerReveal.setValue(0);
      hasMounted.current = false;
      return;
    }

    if (!hasMounted.current) {
      hasMounted.current = true;
    }

    const shakeBranch = Animated.sequence([
      Animated.timing(branchShake, {
        toValue: -10,
        duration: 34,
        useNativeDriver: true,
      }),
      Animated.timing(branchShake, {
        toValue: 10,
        duration: 34,
        useNativeDriver: true,
      }),
      Animated.timing(branchShake, {
        toValue: -8,
        duration: 34,
        useNativeDriver: true,
      }),
      Animated.timing(branchShake, {
        toValue: 6,
        duration: 34,
        useNativeDriver: true,
      }),
      Animated.timing(branchShake, {
        toValue: 0,
        duration: 34,
        useNativeDriver: true,
      }),
    ]);

    Animated.parallel([
      Animated.sequence([
        Animated.delay(180),
        Animated.spring(panelDrop, {
          toValue: 0,
          friction: 7,
          tension: 130,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([Animated.delay(80), shakeBranch]),
      Animated.sequence([
        Animated.delay(460),
        Animated.timing(answerReveal, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [answerReveal, branchShake, isStarted, panelDrop, quizFinished]);

  return (
    <ImageBackground
      source={backgroundSource}
      style={styles.background}
      resizeMode="cover"
    >
      {showSubjectSelector && (
        <Subjects
          isWeb={isWeb}
          gradeId={gradeId}
          entranceFrom={subjectSelectorEntranceDirection}
          onSelectSubject={(subject, _index, gradeSubjectId, currentLevel) => {
            if (
              currentLevel &&
              gradeSubjectId !== undefined &&
              gradeSubjectId !== null &&
              String(currentLevel.gradeSubjectId) === String(gradeSubjectId)
            ) {
              void startSubjectLevel(subject, currentLevel);
            }
          }}
        />
      )}
      <Modal
        visible={subscriptionPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSubscriptionPromptVisible(false)}
      >
        <View style={styles.subscriptionBackdrop}>
          <View style={styles.subscriptionPrompt}>
            <AppText style={styles.subscriptionPromptTitle}>
              {subscriptionGateMessage.startsWith("We couldn’t") ? "Connection needed" : "Subscribe to keep playing"}
            </AppText>
            <AppText style={styles.subscriptionPromptText}>{subscriptionGateMessage}</AppText>
            {subscriptionGateMessage.startsWith("We couldn’t") ? (
              <Pressable
                accessibilityRole="button"
                style={styles.subscriptionPrimaryButton}
                onPress={() => {
                  setSubscriptionPromptVisible(false);
                  setShowSubjectSelector(true);
                }}
              >
                <AppText style={styles.subscriptionPrimaryButtonText}>Retry subscription check</AppText>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                style={styles.subscriptionPrimaryButton}
                onPress={() => {
                  setSubscriptionPromptVisible(false);
                  router.push("/subscription");
                }}
              >
                <AppText style={styles.subscriptionPrimaryButtonText}>View subscriptions</AppText>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              style={styles.subscriptionDismissButton}
              onPress={() => setSubscriptionPromptVisible(false)}
            >
              <AppText style={styles.subscriptionDismissButtonText}>Maybe later</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={quitConfirmationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuitConfirmationVisible(false)}
      >
        <View style={styles.subscriptionBackdrop}>
          <View style={styles.subscriptionPrompt}>
            <AppText style={styles.subscriptionPromptTitle}>Are you sure?</AppText>
            <AppText style={styles.subscriptionPromptText}>
              Are you sure you want to quit playing and go to the home screen?
            </AppText>
            <View style={styles.quitConfirmationActions}>
              <Pressable
                style={[styles.quitConfirmationButton, styles.quitConfirmationYes]}
                accessibilityRole="button"
                onPress={() => {
                  setQuitConfirmationVisible(false);
                  router.replace("/home");
                }}
              >
                <AppText style={styles.subscriptionPrimaryButtonText}>Yes</AppText>
              </Pressable>
              <Pressable
                style={[styles.quitConfirmationButton, styles.quitConfirmationNo]}
                accessibilityRole="button"
                onPress={() => setQuitConfirmationVisible(false)}
              >
                <AppText style={styles.quitConfirmationNoText}>No</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <ProfileGradeCard
        isWeb={isWeb}
        compact={compactWebProfile}
        grade={gradeName || "Loading..."}
        player={selectedPlayer}
        onPress={() => setSubjectLevelDetailsVisible(true)}
      />
      <Pressable
        style={[
          styles.quitPlayLandButton,
          isWeb && styles.webQuitPlayLandButton,
          isWeb && styles.webQuitPlayLandZIndex,
          !isWeb && styles.mobileQuitPlayLandZIndex,
          compactWebProfile && styles.compactQuitPlayLandButton,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Quit Play Land and go home"
        onPress={() => setQuitConfirmationVisible(true)}
      >
        <AppText style={styles.quitPlayLandButtonText}>Quit</AppText>
      </Pressable>
      <SubjectLevelCard
        isWeb={isWeb}
        compact={compactWebProfile}
        subject={selectedSubject}
        level={selectedLevel}
        pointsRequired={selectedLevelPointsRequired}
        timeLimit={selectedLevelTimeLimit}
        pointsAcquired={selectedLevelPointsAcquired}
        showDetails={subjectLevelDetailsVisible}
        onCloseDetails={() => setSubjectLevelDetailsVisible(false)}
        hideCard
      />
      {showTreeAndBranch && (
        <>
          <Image
            source={require("../../assets/lands/kilimanjaro/tree.png")}
            style={[styles.tree, isWeb && webLayerStyles.tree]}
            resizeMode="contain"
          />
          <View
            pointerEvents="none"
            style={[styles.branchAnchor, isWeb && webLayerStyles.branch]}
          >
            <Animated.Image
              source={require("../../assets/lands/kilimanjaro/branch1.png")}
              style={[
                styles.branch,
                {
                  transform: [
                    {
                      rotate: branchShake.interpolate({
                        inputRange: [-10, 0, 10],
                        outputRange: ["-6deg", "0deg", "6deg"],
                      }),
                    },
                  ],
                },
              ]}
              resizeMode="contain"
            />
          </View>
        </>
      )}
      <Timer
        key={`${timerRoundKey}-${questions.length > 0 && !isLoadingQuestions ? "ready" : "loading"}`}
        timerSource={timerSource}
        timerScale={timerScale}
        timerContentOffsetY={timerContentOffsetY}
        duration={timerDuration}
        isReady={questions.length > 0 && !isLoadingQuestions}
        onExpire={() => {
          // when time runs out, end the quiz and show overview
          setQuizFinished(true);
          setIsStarted(false);
          setFeedback(null);
          // ensure lastTimeLeft is set to 0 if timer didn't report final value
          setLastTimeLeft((l) => (l === null ? 0 : l));
        }}
        isStarted={isStarted}
        onTimeUpdate={(t) => setLastTimeLeft(t)}
        currentQuestion={isStarted ? currentQuestionIndex + 1 : undefined}
        totalQuestions={questions.length}
        correctCount={correctCount}
        wrongCount={wrongCount}
        lives={lives}
        lifeCountdown={lifeCountdown}
      />
      <TopRightBar compactWeb={compactWebProfile} xp={xp} stars={stars} onSettingsPress={() => undefined} />
      {networkUnavailable && !showSubjectSelector && (
        <View style={styles.networkBanner} accessibilityRole="alert">
          <AppText style={styles.networkBannerText}>{NO_INTERNET_MESSAGE}</AppText>
        </View>
      )}
      {/** questions list and dynamic rendering */}
      {/* define questions inline so layout is clear */}
      {
        /* prettier-ignore */
      }
      {/* render panel and answers based on currentQuestionIndex */}
      {!quizFinished && <QuestionPanel
        panelDrop={panelDrop}
        panelSource={panelSource}
        blinkEyesSource={blinkEyesSource}
        blinkEyesScale={blinkEyesScale}
        panelScale={panelScale}
        panelHeightScale={panelHeightScale}
        panelOffsetY={panelOffsetY}
        panelContentOffsetY={panelContentOffsetY}
        isWeb={isWeb}
        question={questions[currentQuestionIndex]?.question}
        image={questions[currentQuestionIndex]?.image}
        questionImages={questions[currentQuestionIndex]?.questionImages}
        questionType={
          questions[currentQuestionIndex]?.type ?? "multiple-choice"
        }
        showQuestion={isStarted}
        feedback={feedback}
      />}
      {quizFinished && (
        <View
          style={[styles.overviewOverlay, !isWeb && styles.mobileOverviewOverlay]}
          pointerEvents="box-none"
        >
          <Overview
            duration={typeof lastTimeLeft === "number" ? timerDuration - lastTimeLeft : timerDuration}
            correct={correctCount}
            wrong={wrongCount}
            xpEarned={correctCount * XP_PER_CORRECT_ANSWER}
            pointsAcquired={(() => {
              const before = roundProgressBeforeRef.current;
              return before
                ? before.bestScore + before.pendingXp
                : selectedLevelPointsAcquired;
            })()}
            pointsRequired={selectedLevelPointsRequired}
            attemptMessage={attemptPrompt}
            attemptStatus={attemptOutcome}
            starsEarned={(() => {
              const attempted = correctCount + wrongCount > 0;
              const completedAllQuestions =
                questions.length > 0 && correctCount + wrongCount >= questions.length;
              const timeLeft = lastTimeLeft ?? 0;
              const earnedByTimeAndAccuracy =
                completedAllQuestions &&
                correctCount / questions.length >= 0.8 &&
                timeLeft >= timerDuration * 0.25;
              const perfectScore =
                completedAllQuestions && correctCount === questions.length;
              return Number(attempted) + Number(earnedByTimeAndAccuracy) + Number(perfectScore);
            })()}
          />
          <ResetBar
            isWeb={isWeb}
            actionLabel={attemptActionLabel}
            actionVariant={attemptOutcome === "second-attempt" ? "second-attempt" : attemptOutcome === "fresh-start" ? "retry" : "continue"}
            onContinue={async () => {
              playPopSound();
              if (attemptOutcome === "second-attempt" || attemptOutcome === "fresh-start") {
                const latestProgress = progressRecordRef.current;
                const levelId = latestProgress?.gameLevelId;
                if (levelId === undefined) {
                  setRoundError("Could not load another set of questions. Please try again.");
                  return;
                }
                const currentRoundSequence = roundSequenceRef.current;
                const roundAlreadySaved = savedRoundSequenceRef.current >= currentRoundSequence;
                let nextProgress = latestProgress ? { ...latestProgress } : null;
                if (nextProgress && !roundAlreadySaved) {
                  const roundXp = correctCount * XP_PER_CORRECT_ANSWER;
                  const roundCompleted = correctCount + wrongCount >= questions.length;
                  const roundStars =
                    Number(correctCount + wrongCount > 0) +
                    Number(
                      roundCompleted &&
                        correctCount / Math.max(questions.length, 1) >= 0.8 &&
                        (lastTimeLeft ?? 0) >= timerDuration * 0.25,
                    ) +
                    Number(roundCompleted && correctCount === questions.length);
                  nextProgress = {
                    ...nextProgress,
                    attempts: nextProgress.attempts + 1,
                    passAttempts:
                      attemptOutcome === "second-attempt"
                        ? nextProgress.passAttempts + 1
                        : 0,
                    pendingXp:
                      attemptOutcome === "second-attempt"
                        ? nextProgress.pendingXp + roundXp
                        : 0,
                    pendingStars:
                      attemptOutcome === "second-attempt"
                        ? Math.max(nextProgress.pendingStars, roundStars)
                        : 0,
                  };
                }
                roundProgressBeforeRef.current = nextProgress;
                roundSequenceRef.current += 1;
                recordedAttemptKeysRef.current.clear();
                resetRoundStats();
                if (attemptOutcome === "second-attempt") {
                  const secondAttemptPool = shuffle(questionPoolRef.current.slice(5, 10));
                  setQuestions(
                    secondAttemptPool.length > 0
                      ? secondAttemptPool
                      : shuffle(questionPoolRef.current).slice(0, 5),
                  );
                  setTimerRoundKey((key) => key + 1);
                } else {
                  const loaded = await loadRound(levelId);
                  if (!loaded) return;
                }
                if (livesRef.current === 0) {
                  pendingRoundStartRef.current = true;
                  setShowRoundStart(true);
                  setIsStarted(false);
                  return;
                }
                pendingRoundStartRef.current = false;
                onRoundStart?.(true);
                setShowRoundStart(false);
                setIsStarted(true);
                return;
              }
              await Promise.all(pendingAttemptWritesRef.current);
              const progressSaved = await progressSavePromiseRef.current;
              if (progressSaved === false) {
                setRoundError("Could not save this level progress.");
                return;
              }
              onRoundStart?.(false);
              setQuizFinished(false);
              setShowRoundStart(false);
              setRoundError(null);
              setShowSubjectSelector(true);
            }}
          />
        </View>
      )}
      {!isStarted && showRoundStart && (
        <Animated.View
          style={[
            styles.roundStartButtonWrapper,
            { transform: [
              { translateX: roundStartSlide.interpolate({ inputRange: [0, 1], outputRange: [120, 0] }) },
            ] },
          ]}
        >
          {lives === 0 ? (
            <View style={styles.noLivesCard}>
              <AppText style={styles.noLivesTitle}>You’re out of lives</AppText>
              <AppText style={styles.noLivesCountdown}>{`Next life in ${lifeCountdown}`}</AppText>
              <AppText style={styles.noLivesMessage}>Keep learning while you wait.</AppText>
              <Pressable
                style={styles.practiceButton}
                accessibilityRole="button"
                onPress={() => router.push("/practice")}
              >
                <AppText style={styles.practiceButtonText}>Go to Practice</AppText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.roundStartRow}>
              <Pressable
                style={styles.roundBackButton}
                accessibilityRole="button"
                accessibilityLabel="Back to subject selection"
                onPress={() => {
                  playPopSound();
                  roundStartSlide.stopAnimation();
                  Animated.timing(roundStartSlide, {
                    toValue: 0,
                    duration: 320,
                    useNativeDriver: true,
                  }).start(({ finished }) => {
                    if (!finished) return;
                    setShowRoundStart(false);
                    setSubjectSelectorEntranceDirection("left");
                    setShowSubjectSelector(true);
                    setRoundError(null);
                    setQuestions([]);
                    setSelectedSubject(null);
                    resetRoundStats();
                  });
                }}
              >
                <Animated.Text
                  style={[styles.roundBackButtonText, { transform: [{ translateX: backArrowPoint }] }]}
                >
                  ‹
                </Animated.Text>
              </Pressable>
              <AnimatedPressable
                style={[styles.roundStartButton, { transform: [{ translateY: startButtonBounce }] }]}
                accessibilityRole="button"
                disabled={subscriptionCheckLoading}
                onPress={async () => {
              if (livesRef.current === 0) return;
              if (!livesReady) {
                setSubscriptionCheckLoading(true);
                await refreshLives();
                setSubscriptionCheckLoading(false);
                return;
              }
              setSubscriptionCheckLoading(true);
              try {
                const userKey = await AsyncStorage.getItem("kido.numericUserId") ?? await AsyncStorage.getItem("kido.userId") ?? "guest";
                const token = await AsyncStorage.getItem("kido.authToken");
                const freeLevelId = await AsyncStorage.getItem(`${FREE_LEVEL_USED_KEY}:${userKey}`);
                const currentLevelId = String(progressRecordRef.current?.gameLevelId ?? "");
                if (freeLevelId && freeLevelId !== currentLevelId) {
                  if (!token) {
                    setSubscriptionGateMessage("Your free level has been used. Subscribe to continue playing.");
                    setSubscriptionPromptVisible(true);
                    return;
                  }
                  const subscription = await getMySubscription(token);
                  if (!subscription.hasActiveSubscription) {
                    setSubscriptionGateMessage("Your free level has been used. Subscribe to continue playing.");
                    setSubscriptionPromptVisible(true);
                    return;
                  }
                } else if (!freeLevelId) {
                  await AsyncStorage.setItem(`${FREE_LEVEL_USED_KEY}:${userKey}`, currentLevelId);
                }
              } catch {
                setSubscriptionGateMessage("We couldn’t check your subscription. Check your connection and try again.");
                setSubscriptionPromptVisible(true);
                return;
              } finally {
                setSubscriptionCheckLoading(false);
              }
              playPopSound();
              if (pendingRoundStartRef.current) {
                pendingRoundStartRef.current = false;
              } else {
                roundSequenceRef.current += 1;
                roundProgressBeforeRef.current = progressRecordRef.current
                  ? { ...progressRecordRef.current }
                  : null;
              }
              onRoundStart?.(true);
              setShowRoundStart(false);
              setIsStarted(true);
              setQuizFinished(false);
                }}
              >
                <AppText style={styles.roundStartButtonText}>{subscriptionCheckLoading ? "Checking…" : "Start"}</AppText>
              </AnimatedPressable>
            </View>
          )}
        </Animated.View>
      )}

      {isStarted && !quizFinished && (
          <Answers
            key={currentQuestionIndex}
            answerBoardSource={answerBoardSource}
            answers={questions[currentQuestionIndex].answers}
            questionType={
              questions[currentQuestionIndex]?.type ?? "multiple-choice"
            }
            answerImages={questions[currentQuestionIndex]?.options}
            reveal={answerReveal}
            isWeb={isWeb}
            correctAnswer={questions[currentQuestionIndex].correct}
            onAnswer={(isCorrect: boolean) => {
              playAnswerSound(isCorrect);
              const currentQuestion = questions[currentQuestionIndex];
              const questionId = Number(currentQuestion?.id);
              const attemptKey = `${currentQuestionIndex}:${currentQuestion?.id}`;
              const pauseRoundForNoLives = () => {
                if (pendingRoundStartRef.current) return;
                if (currentQuestionIndex < questions.length - 1) {
                  setCurrentQuestionIndex((index) => index + 1);
                  pendingRoundStartRef.current = true;
                  onRoundStart?.(false);
                  setIsStarted(false);
                  setShowRoundStart(true);
                }
                setFeedback(null);
              };
              const advanceAfterAnswer = () => {
                if (livesRef.current === 0 && currentQuestionIndex < questions.length - 1) {
                  pauseRoundForNoLives();
                  return;
                }
                setTimeout(() => {
                  if (pendingRoundStartRef.current) {
                    setFeedback(null);
                    return;
                  }
                  const hasAnotherQuestion = currentQuestionIndex < questions.length - 1;
                  if (livesRef.current === 0 && hasAnotherQuestion) {
                    pauseRoundForNoLives();
                  } else if (hasAnotherQuestion) {
                    setCurrentQuestionIndex((index) => index + 1);
                  } else {
                    setQuizFinished(true);
                    setIsStarted(false);
                  }
                  setFeedback(null);
                }, 700);
              };
              if (
                Number.isInteger(questionId) &&
                questionId > 0 &&
                !recordedAttemptKeysRef.current.has(attemptKey)
              ) {
                recordedAttemptKeysRef.current.add(attemptKey);
                if (!isCorrect) {
                  // Spend a life locally before any network work so question progression stays immediate.
                  const nextState = consumePlayerLife({ lives: livesRef.current, nextLifeAt });
                  syncLives(nextState);
                  void AsyncStorage.getItem("kido.numericUserId")
                    .then(async (numericId) => numericId ?? await AsyncStorage.getItem("kido.userId") ?? "guest")
                    .then((userKey) => savePlayerLives(userKey, nextState))
                    .catch(() => undefined);
                }
                const attemptWrite = AsyncStorage.getItem("kido.authToken")
                  .then(async (token) => {
                    if (!token) return;
                    const response = await postQuestionAttempt(
                      {
                        questionId,
                        isCorrect,
                        pointsEarned: isCorrect ? XP_PER_CORRECT_ANSWER : 0,
                      },
                      token,
                    );
                    if (response?.success) setNetworkUnavailable(false);
                  })
                  .catch((error: unknown) => {
                    console.warn("Could not record question attempt:", error);
                    if (isNetworkError(error)) setNetworkUnavailable(true);
                  });
                pendingAttemptWritesRef.current.add(attemptWrite);
                void attemptWrite.then(() => {
                  pendingAttemptWritesRef.current.delete(attemptWrite);
                });
                setFeedback(isCorrect ? "Correct" : "Wrong");
                if (isCorrect) setCorrectCount((c) => c + 1);
                else setWrongCount((w) => w + 1);
                advanceAfterAnswer();
                return;
              } else if (!Number.isInteger(questionId) || questionId <= 0) {
                console.warn("Skipping question attempt with invalid question ID.");
              }
              setFeedback(isCorrect ? "Correct" : "Wrong");
              if (isCorrect) setCorrectCount((c) => c + 1);
              else setWrongCount((w) => w + 1);
              advanceAfterAnswer();
            }}
          />
        )}

      {(isLoadingQuestions || roundError) && !showSubjectSelector && !isStarted && !quizFinished && (
        <Animated.View style={[
          styles.roundMessage,
          isLoadingQuestions && {
            opacity: questionLoadingSlide,
            transform: [{ translateX: questionLoadingSlide.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }],
          },
        ]}>
          {isLoadingQuestions ? (
            <>
              <Animated.View
                style={[
                  styles.questionLoadingMascot,
                  {
                    opacity: questionLoadingPulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
                    transform: [
                      { scale: questionLoadingPulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.08] }) },
                      { rotate: questionLoadingPulse.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "8deg"] }) },
                    ],
                  },
                ]}
              >
                <AppText style={styles.questionLoadingMascotText}>🌱</AppText>
              </Animated.View>
              <AppText style={styles.roundMessageText}>
                {QUESTION_LOADING_MESSAGES[loadingMessageIndex]}
              </AppText>
              <View style={styles.questionLoadingTrail}>
                {questionLoadingDotPulses.map((dot, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.questionLoadingTrailDot,
                      index === 1 && styles.questionLoadingTrailDotMiddle,
                      {
                        opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
                        transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.3] }) }],
                      },
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <AppText style={styles.roundMessageText}>{roundError}</AppText>
          )}
          {roundError ? (
            <Pressable onPress={() => { setRoundError(null); setShowSubjectSelector(true); }} style={styles.roundMessageButton}>
              <AppText style={styles.roundMessageButtonText}>Choose another subject</AppText>
            </Pressable>
          ) : null}
        </Animated.View>
      )}

      <SafeAreaView style={styles.safe}></SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, width: "100%", height: "100%" },
  safe: { flex: 1 },
  overviewOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    elevation: 20,
  },
  mobileOverviewOverlay: { zIndex: 34 },
  tree: {
    position: "absolute",
    bottom: -150,
    left: -200,
    width: 720,
    height: 1380,
    zIndex: 6,
  },
  branchAnchor: {
    position: "absolute",
    bottom: 40,
    left: -135,
    width: 720,
    height: 1120,
    zIndex: 5,
  },
  branch: {
    width: "100%",
    height: "100%",
  },
  networkBanner: {
    position: "absolute",
    top: 78,
    left: 18,
    right: 18,
    zIndex: 300,
    elevation: 300,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "rgba(255, 244, 215, 0.97)",
    borderWidth: 2,
    borderColor: "#e6b95b",
  },
  networkBannerText: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 14,
    textAlign: "center",
  },
  roundMessage: {
    position: "absolute",
    top: "38%",
    alignSelf: "center",
    zIndex: 45,
    width: "78%",
    maxWidth: 420,
    padding: 22,
    borderRadius: 22,
    alignItems: "center",
    backgroundColor: "rgba(255, 244, 215, 0.96)",
    borderWidth: 3,
    borderColor: "#e6b95b",
  },
  roundMessageText: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 18,
    textAlign: "center",
  },
  questionLoadingMascot: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderRadius: 31,
    backgroundColor: "#fff0b8",
  },
  questionLoadingMascotText: { fontSize: 34 },
  questionLoadingTrail: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  questionLoadingTrailDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#e8a800" },
  questionLoadingTrailDotMiddle: { width: 13, height: 13, borderRadius: 7, backgroundColor: "#ffb703" },
  roundMessageButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#ffb703",
  },
  roundMessageButtonText: {
    color: "#fff",
    fontFamily: "FredokaBold",
    fontSize: 16,
  },
  roundStartButton: {
    width: 190,
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffb703",
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderWidth: 2,
    borderColor: "#fff6d6",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  roundStartRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  roundBackButton: {
    width: 58,
    height: 58,
    transform: [{ translateX: -6 }],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff4d0",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#f4b942",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  roundBackButtonText: { color: "#503617", fontFamily: "FredokaBold", fontSize: 42, lineHeight: 46, marginTop: -5 },
  quitPlayLandButton: {
    position: "absolute",
    top: 144,
    left: 18,
    width: 91,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: "rgba(255, 244, 208, 0.96)",
    borderColor: "#f4b942",
    borderWidth: 3,
    borderRadius: 16,
    shadowColor: "#5b3218",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    zIndex: 32,
    elevation: 4,
  },
  webQuitPlayLandButton: { top: 194, left: 24, width: 160, minHeight: 68, borderRadius: 20 },
  webQuitPlayLandZIndex: { zIndex: 33 },
  mobileQuitPlayLandZIndex: { zIndex: 33, elevation: 19 },
  compactQuitPlayLandButton: { top: 144, left: 18, width: 112, minHeight: 50, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 15 },
  quitPlayLandButtonText: { color: "#503617", fontFamily: "FredokaBold", fontSize: 17 },
  noLivesCard: {
    width: "88%",
    maxWidth: 380,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 22,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#e6b95b",
    backgroundColor: "rgba(255, 244, 215, 0.97)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  noLivesTitle: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 26,
    textAlign: "center",
  },
  noLivesCountdown: {
    marginTop: 8,
    color: "#a45a12",
    fontFamily: "FredokaBold",
    fontSize: 21,
    textAlign: "center",
  },
  noLivesMessage: {
    marginTop: 6,
    color: "#6b4a28",
    fontFamily: "FredokaMedium",
    fontSize: 16,
    textAlign: "center",
  },
  practiceButton: {
    minWidth: 190,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 17,
    backgroundColor: "#ffb703",
  },
  practiceButtonText: {
    color: "#fff",
    fontFamily: "FredokaBold",
    fontSize: 19,
  },
  roundStartButtonWrapper: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  roundStartButtonText: {
    color: "#fff",
    fontFamily: "FredokaBold",
    fontSize: 26,
    letterSpacing: 0.5,
  },
  subscriptionBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(35, 22, 12, 0.58)",
  },
  subscriptionPrompt: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    padding: 24,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#f4b942",
    backgroundColor: "#fff4d0",
  },
  subscriptionPromptTitle: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 25,
    textAlign: "center",
  },
  subscriptionPromptText: {
    marginTop: 12,
    color: "#6b4a28",
    fontFamily: "FredokaMedium",
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
  },
  subscriptionPrimaryButton: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#ffb703",
  },
  subscriptionPrimaryButtonText: {
    color: "#fff",
    fontFamily: "FredokaBold",
    fontSize: 17,
    textAlign: "center",
  },
  quitConfirmationActions: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  quitConfirmationButton: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  quitConfirmationYes: { backgroundColor: "#ffb703" },
  quitConfirmationNo: { backgroundColor: "#f1dfb2" },
  quitConfirmationNoText: { color: "#503617", fontFamily: "FredokaBold", fontSize: 17 },
  subscriptionDismissButton: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  subscriptionDismissButtonText: {
    color: "#6b4a28",
    fontFamily: "FredokaMedium",
    fontSize: 15,
  },
});
