import AppText from "../app-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
    Animated,
    AppState,
    Image,
    ImageBackground,
    ImageSourcePropType,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    getAuthToken,
    getGrades,
    getLevelQuestions,
    getUserLevelProgress,
    getUserGameProfile,
    getUserChallenges,
    getAllUserGifts,
    getUserMe,
    getMyLives,
    postAuthLogin,
    postQuestionAttempt,
    postUserLevelProgress,
    updateUserLevelProgress,
    type GameQuestion
} from "../../lib/api";
import { useAudioPreferences } from "../../lib/audio-preferences";
import { API_BASE } from "../../lib/config";
import { getKidoLanguage } from "../../lib/language-preferences";
import { getPlayLandErrorMessage, isNetworkError, NO_INTERNET_MESSAGE } from "../../lib/network-errors";
import Answers from "./play-land-components/answers";
import Overview from "./play-land-components/overview";
import ProfileGradeCard from "./play-land-components/profile-grade-card";
import QuestionPanel from "./play-land-components/question-panel";
import ResetBar from "./play-land-components/reset-bar";
import SubjectLevelCard from "./play-land-components/subject-level-card";
import Subjects, { type CurrentLevel } from "./play-land-components/subjects";
import Timer from "./play-land-components/timer";
import TopRightBar from "./play-land-components/top-right-bar";

type KilimanjaroProps = {
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
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedLevelPointsRequired, setSelectedLevelPointsRequired] = useState(0);
  const [selectedLevelTimeLimit, setSelectedLevelTimeLimit] = useState(0);
  const [selectedLevelPointsAcquired, setSelectedLevelPointsAcquired] = useState(0);
  const [questions, setQuestions] = useState<PlayableQuestion[]>([]);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [networkUnavailable, setNetworkUnavailable] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
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
  const [nextLifeAt, setNextLifeAt] = useState<string | null>(null);
  const livesRef = useRef(3);
  const [lifeCountdown, setLifeCountdown] = useState("05:00");
  const [levelAttemptMessage, setLevelAttemptMessage] = useState<string | null>(null);
  const hasMounted = useRef(false);
  const progressRecordRef = useRef<LevelProgressSnapshot | null>(null);
  const roundProgressBeforeRef = useRef<LevelProgressSnapshot | null>(null);
  const progressSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const progressPreparationRef = useRef<Promise<void> | null>(null);
  const recordedAttemptKeysRef = useRef(new Set<string>());
  const pendingAttemptWritesRef = useRef(new Set<Promise<number | null>>());
  const panelDrop = useRef(new Animated.Value(-1200)).current;
  const branchShake = useRef(new Animated.Value(0)).current;
  const answerReveal = useRef(new Animated.Value(0)).current;
  const startButtonBounce = useRef(new Animated.Value(0)).current;

  const syncLives = (nextLives: number, recoveryAt: string | null) => {
    const safeLives = Math.max(0, Math.min(3, nextLives));
    livesRef.current = safeLives;
    setLives(safeLives);
    setNextLifeAt(recoveryAt);
  };

  const refreshLives = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("kido.authToken");
      if (!token) return;
      const state = await getMyLives(token);
      syncLives(state.lives, state.nextLifeAt);
      setNetworkUnavailable(false);
    } catch (error) {
      if (isNetworkError(error)) setNetworkUnavailable(true);
      // Keep the last known lives if the server is temporarily unavailable.
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
    let refreshing = false;
    const updateCountdown = () => {
      const remaining = Math.max(0, new Date(nextLifeAt).getTime() - Date.now());
      const totalSeconds = Math.ceil(remaining / 1000);
      setLifeCountdown(`${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`);
      if (remaining === 0 && livesRef.current < 3 && !refreshing) {
        refreshing = true;
        void AsyncStorage.getItem("kido.authToken")
          .then((token) => token ? getMyLives(token) : null)
          .then((state) => { if (state) syncLives(state.lives, state.nextLifeAt); })
          .catch(() => undefined)
          .finally(() => { refreshing = false; });
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [nextLifeAt]);

  useEffect(() => {
    if (lives >= 3) {
      setLifeCountdown("05:00");
      return;
    }
    if (!nextLifeAt) {
      setLifeCountdown("05:00");
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
        const storedUserId = await AsyncStorage.getItem("kido.userId");
        const storedToken = await AsyncStorage.getItem("kido.authToken");
        let token = storedToken;

        // Refresh the auth token from the saved user ID so Play can load the
        // profile without requiring a visit to the account card on Home.
        if (storedUserId) {
          const loginResponse = await postAuthLogin({ userID: storedUserId });
          token = getAuthToken(loginResponse) ?? token;
        }

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
        void getMyLives(token)
          .then((lifeState) => {
            if (!cancelled) {
              syncLives(lifeState.lives, lifeState.nextLifeAt);
              setNetworkUnavailable(false);
            }
          })
          .catch((error) => {
            if (!cancelled && isNetworkError(error)) setNetworkUnavailable(true);
            // Keep the default three lives when the game profile is unavailable.
          });
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

  useEffect(() => {
    if (!quizFinished) return;
    let cancelled = false;

    const updateProgress = async (): Promise<boolean> => {
      try {
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
        if (!cancelled) {
          setLevelAttemptMessage(
            savedProgress?.completed === true
              ? "Required XP reached. This level's rewards are now included in your totals."
              : savedProgress?.attemptWindowFailed === true
                ? "The target was missed in both attempts. XP and stars from those attempts were not added. You can try again."
                : `Attempt ${existing.passAttempts + 1} of 2. XP and stars from these attempts count only after reaching the target.`,
          );
          progressRecordRef.current = {
            ...existing,
            bestScore: Number(savedProgress?.bestScore ?? existing.bestScore),
            attempts: Number(savedProgress?.attempts ?? existing.attempts + 1),
            stars: Number(savedProgress?.stars ?? existing.stars),
            completed: savedProgress?.completed === true,
            passAttempts: Number(savedProgress?.passAttempts ?? 0),
            pendingXp: Number(savedProgress?.pendingXp ?? 0),
            pendingStars: Number(savedProgress?.pendingStars ?? 0),
          };
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
        }
        return true;
      } catch (error) {
        if (!cancelled) {
          if (isNetworkError(error)) setNetworkUnavailable(true);
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

  const prepareLevelProgress = async (gameLevelId: string | number) => {
    const numericGameLevelId = Number(gameLevelId);
    if (!Number.isFinite(numericGameLevelId)) {
      throw new Error("This level has an invalid ID.");
    }
    const storedUserId = await AsyncStorage.getItem("kido.userId");
    let token = await AsyncStorage.getItem("kido.authToken");
    if (storedUserId) {
      const loginResponse = await postAuthLogin({ userID: storedUserId });
      token = getAuthToken(loginResponse) ?? token;
      if (token) await AsyncStorage.setItem("kido.authToken", String(token));
    }
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
      const response = await getLevelQuestions(levelId, language);
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
      const selected = shuffle(playable).slice(0, 5);
      if (selected.length === 0) {
        setQuestions([]);
        setRoundError("No questions are available for this level.");
        return false;
      }
      setQuestions(selected);
      recordedAttemptKeysRef.current.clear();
      resetRoundStats();
      return true;
    } catch (error) {
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
    playPopSound();
    setSelectedSubject(subject);
    setSelectedLevel(level.levelNumber);
    setSelectedLevelPointsRequired(level.pointsRequired);
    setSelectedLevelTimeLimit(level.timeLimit);
    setSelectedLevelPointsAcquired(level.pointsAcquired);
    setRoundError(null);
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
      <ProfileGradeCard isWeb={isWeb} grade={gradeName || "Loading..."} />
      <SubjectLevelCard
        isWeb={isWeb}
        subject={selectedSubject}
        level={selectedLevel}
        pointsRequired={selectedLevelPointsRequired}
        timeLimit={selectedLevelTimeLimit}
        pointsAcquired={selectedLevelPointsAcquired}
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
        timerSource={timerSource}
        timerScale={timerScale}
        timerContentOffsetY={timerContentOffsetY}
        duration={timerDuration}
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
      <TopRightBar xp={xp} stars={stars} onSettingsPress={() => undefined} />
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
        <View style={styles.overviewOverlay}>
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
            attemptMessage={levelAttemptMessage ?? (() => {
              const before = roundProgressBeforeRef.current;
              if (!before) return undefined;
              const attemptNumber = before.completed ? 0 : before.passAttempts + 1;
              const potentialScore = before.bestScore + before.pendingXp + correctCount * XP_PER_CORRECT_ANSWER;
              if (before.completed || potentialScore >= selectedLevelPointsRequired) {
                return "Required XP reached. This level's rewards will be included in your totals.";
              }
              if (attemptNumber >= 2) {
                return "If this attempt ends below the target, rewards from both attempts will be discarded.";
              }
              return `Attempt ${attemptNumber} of 2. XP and stars stay pending until you reach the target.`;
            })()}
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
            onContinue={async () => {
              playPopSound();
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
            { transform: [{ translateY: startButtonBounce }] },
          ]}
        >
          <Pressable
            style={styles.roundStartButton}
            accessibilityRole="button"
            disabled={lives === 0}
            onPress={() => {
              if (livesRef.current === 0) return;
              playPopSound();
              roundProgressBeforeRef.current = progressRecordRef.current
                ? { ...progressRecordRef.current }
                : null;
              onRoundStart?.(true);
              setShowRoundStart(false);
              setIsStarted(true);
              setQuizFinished(false);
            }}
          >
            <AppText style={styles.roundStartButtonText}>{lives === 0 ? `Next life in ${lifeCountdown}` : "Start"}</AppText>
          </Pressable>
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
              if (
                Number.isInteger(questionId) &&
                questionId > 0 &&
                !recordedAttemptKeysRef.current.has(attemptKey)
              ) {
                recordedAttemptKeysRef.current.add(attemptKey);
                const attemptWrite = AsyncStorage.getItem("kido.authToken")
                  .then(async (token) => {
                    if (!token) {
                      throw new Error("Missing user authentication token.");
                    }
                    const response: any = await postQuestionAttempt(
                      {
                        questionId,
                        isCorrect,
                        pointsEarned: isCorrect ? XP_PER_CORRECT_ANSWER : 0,
                      },
                      token,
                    );
                    let lifeState = response?.lives ?? response?.data?.lives;
                    if (!Number.isFinite(Number(lifeState?.lives))) {
                      try {
                        const fallback: any = await getMyLives(token);
                        lifeState = fallback?.lives ? fallback : fallback?.data ?? fallback;
                      } catch {
                        // Older backend builds may not yet expose the lives endpoint.
                      }
                    }
                    if (!Number.isFinite(Number(lifeState?.lives))) return null;
                    syncLives(Number(lifeState.lives), lifeState.nextLifeAt ?? null);
                    setNetworkUnavailable(false);
                    return Number(lifeState.lives);
                  })
                  .catch(async (error: unknown) => {
                    console.warn("Could not record question attempt:", error);
                    if (isNetworkError(error)) setNetworkUnavailable(true);
                    try {
                      const token = await AsyncStorage.getItem("kido.authToken");
                      if (token) {
                        const fallback: any = await getMyLives(token);
                        const state = fallback?.lives ? fallback : fallback?.data ?? fallback;
                        if (Number.isFinite(Number(state?.lives))) {
                          syncLives(Number(state.lives), state.nextLifeAt ?? null);
                          setNetworkUnavailable(false);
                          return Number(state.lives);
                        }
                      }
                    } catch {
                      // Keep gameplay usable if life status cannot be fetched.
                    }
                    return null;
                  });
                pendingAttemptWritesRef.current.add(attemptWrite);
                void attemptWrite.then(() => {
                  pendingAttemptWritesRef.current.delete(attemptWrite);
                });
                setFeedback(isCorrect ? "Correct" : "Wrong");
                if (isCorrect) setCorrectCount((c) => c + 1);
                else setWrongCount((w) => w + 1);
                setTimeout(async () => {
                  const remainingLives = await attemptWrite;
                  if (remainingLives === 0) {
                    setIsStarted(false);
                    setFeedback(null);
                    if (currentQuestionIndex < questions.length - 1) {
                      setCurrentQuestionIndex((i) => i + 1);
                      setShowRoundStart(true);
                    } else {
                      setQuizFinished(true);
                    }
                    return;
                  }
                  if (currentQuestionIndex < questions.length - 1) {
                    setCurrentQuestionIndex((i) => i + 1);
                  } else {
                    setQuizFinished(true);
                    setIsStarted(false);
                  }
                  setFeedback(null);
                }, 700);
                return;
              } else if (!Number.isInteger(questionId) || questionId <= 0) {
                console.warn("Skipping question attempt with invalid question ID.");
              }
              setFeedback(isCorrect ? "Correct" : "Wrong");
              if (isCorrect) setCorrectCount((c) => c + 1);
              else setWrongCount((w) => w + 1);
              // advance to next question after short delay so feedback is visible
              setTimeout(() => {
                if (currentQuestionIndex < questions.length - 1) {
                  setCurrentQuestionIndex((i) => i + 1);
                } else {
                  // finished all questions
                  setQuizFinished(true);
                  setIsStarted(false);
                }
                setFeedback(null);
              }, 700);
            }}
          />
        )}

      {(isLoadingQuestions || roundError) && !showSubjectSelector && !isStarted && !quizFinished && (
        <View style={styles.roundMessage}>
          <AppText style={styles.roundMessageText}>{isLoadingQuestions ? "Loading questions..." : roundError}</AppText>
          {roundError ? (
            <Pressable onPress={() => { setRoundError(null); setShowSubjectSelector(true); }} style={styles.roundMessageButton}>
              <AppText style={styles.roundMessageButtonText}>Choose another subject</AppText>
            </Pressable>
          ) : null}
        </View>
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
    zIndex: 100,
    elevation: 20,
  },
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
});
