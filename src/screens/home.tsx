import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  createAudioPlayer,
  setAudioModeAsync,
  useAudioPlayer,
} from "expo-audio";
import { useFonts } from "expo-font";
import { useFocusEffect, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  Easing,
  Image,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../components/app-text";
import AppTextInput from "../components/app-text-input";
import LoginCard from "../components/login-card";
import ProfileGradeCard from "../components/play-land/play-land-components/profile-grade-card";
import RegisterCard from "../components/register-card";
import SchoolPicker from "../components/school-picker";
import SettingsCard from "../components/settings-card";
import api, {
  addUserPassword,
  getAllUserGifts,
  getCurrentAuthToken,
  getGrades,
  getSchoolByCode,
  getUserChallenges,
  getUserGameProfile,
  getUserLevelProgress,
  getUserMe,
  type SchoolOption,
  updateUserAccount,
  updateUserLanguage,
  type UserGameProfileGenreStat,
} from "../lib/api";
import { useAudioPreferences } from "../lib/audio-preferences";
import { logoutAuthSession } from "../lib/auth-session";
import { useKidoLanguage } from "../lib/language-context";
import { KIDO_LANGUAGE_KEY, type KidoLanguage } from "../lib/language-preferences";
import { getPlayLandErrorMessage } from "../lib/network-errors";

const navItems = [{ label: "Play", color: "#f8c25a" }];

const profileActionCards = [
  {
    key: "streak",
    label: "Streak",
    subtitle: "Fire",
    source: require("../assets/fire.png"),
  },
  {
    key: "challenge",
    label: "Challenge",
    subtitle: "Target",
    source: require("../assets/target.png"),
  },
  {
    key: "gift",
    label: "Gift",
    subtitle: "Reward",
    source: require("../assets/gift.png"),
  },
];

const popSound = require("../assets/sound.effects/pop.mp3");
const backgroundMusic = require("../assets/sound.effects/music1.mp3");
const playerSpriteColumns = 6;
const playerSpriteRows = 1;
const playerSpriteAnimationRows = 1;
const playerSpriteFrameWidth = 120;
const playerSpriteFrameHeight = 274;
const playerSpriteFrameCount = playerSpriteColumns * playerSpriteAnimationRows;
const playerSpriteFrameInputRange = Array.from(
  { length: playerSpriteFrameCount },
  (_, frame) => frame,
);
const playerSpriteFrameX = playerSpriteFrameInputRange.map(
  (frame) => -(frame % playerSpriteColumns) * playerSpriteFrameWidth,
);
const playerSpriteFrameY = playerSpriteFrameInputRange.map(
  (frame) => -Math.floor(frame / playerSpriteColumns) * playerSpriteFrameHeight,
);
const preferenceKeys = {
  theme: "kido.theme",
  language: KIDO_LANGUAGE_KEY,
} as const;

let backgroundPlayer: ReturnType<typeof createAudioPlayer> | null = null;
let webBackgroundAudioUnlocked = false;

const getBackgroundPlayer = () => {
  if (!backgroundPlayer) {
    backgroundPlayer = createAudioPlayer(backgroundMusic);
    backgroundPlayer.loop = true;
    backgroundPlayer.volume = 0.4;
  }

  return backgroundPlayer;
};

const stopBackgroundMusic = () => {
  if (!backgroundPlayer) {
    return;
  }

  try {
    if (backgroundPlayer.playing) {
      backgroundPlayer.pause();
    }
  } catch {
    // Ignore released shared audio objects during navigation cleanup.
  }
};

const getUserPayload = (response: any) =>
  response?.user ?? response?.data?.user ?? response?.data ?? response;

const formatAccountDob = (value: unknown) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const getAccountDob = (user: any) =>
  formatAccountDob(user?.DoB ?? user?.dob ?? user?.dateOfBirth);

export default function Home() {
  const router = useRouter();
  const popPlayer = useAudioPlayer(popSound);
  const {
    soundEnabled,
    musicEnabled,
    preferencesLoaded: audioPreferencesLoaded,
    setSoundEnabled,
    setMusicEnabled,
  } = useAudioPreferences();
  const isWeb = Platform.OS === "web";
  const { width } = useWindowDimensions();
  const [theme, setTheme] = useState<"day" | "dark">("day");
  const { language, setLanguage } = useKidoLanguage();
  const languageChangeRevision = useRef(0);
  const [xp, setXp] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);
  const [stars, setStars] = useState<number>(0);
  const [genreStats, setGenreStats] = useState<UserGameProfileGenreStat[]>([]);
  const [rewardsBreakdownVisible, setRewardsBreakdownVisible] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [registrationResetKey, setRegistrationResetKey] = useState(0);
  const [loginVisible, setLoginVisible] = useState(false);
  const [openAccountAfterLogin, setOpenAccountAfterLogin] = useState(false);
  const [accountVisible, setAccountVisible] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [logoutSaving, setLogoutSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [accountUserId, setAccountUserId] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [accountDob, setAccountDob] = useState("");
  const [accountGrade, setAccountGrade] = useState("");
  const [accountGradeName, setAccountGradeName] = useState("");
  const [accountSchoolCode, setAccountSchoolCode] = useState("");
  const [accountSchool, setAccountSchool] = useState<SchoolOption | null>(null);
  const [accountSchoolPickerOpen, setAccountSchoolPickerOpen] = useState(false);
  const [schoolPromptVisible, setSchoolPromptVisible] = useState(false);
  const [schoolPromptSaving, setSchoolPromptSaving] = useState(false);
  const [schoolPromptError, setSchoolPromptError] = useState("");
  const [accountGrades, setAccountGrades] = useState<
    Array<{ id: number | string; name: string }>
  >([]);
  const [gradeMenuOpen, setGradeMenuOpen] = useState(false);
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState("Not available");
  const sunY = useRef(new Animated.Value(0)).current;
  const sunOpacity = useRef(new Animated.Value(1)).current;
  const sunScale = useRef(new Animated.Value(1)).current;
  const moonOpacity = useRef(new Animated.Value(0)).current;
  const moonY = useRef(new Animated.Value(-260)).current;
  const playPopSound = () => {
    if (!soundEnabled) {
      return;
    }

    popPlayer.seekTo(0);
    popPlayer.play();
  };

  const handleLanguageChange = async (nextLanguage: KidoLanguage) => {
    languageChangeRevision.current += 1;
    setLanguage(nextLanguage);

    try {
      const token = await AsyncStorage.getItem("kido.authToken");
      if (token) await updateUserLanguage(nextLanguage, token);
    } catch (error) {
      console.warn("Could not sync language preference to account:", error);
    }
  };
  const parrotX = useRef(new Animated.Value(0)).current;
  const parrotY = useRef(new Animated.Value(0)).current;
  const parrotRotate = useRef(new Animated.Value(0)).current;
  const settingsScale = useRef(new Animated.Value(1)).current;
  const starScale = useRef(new Animated.Value(1)).current;
  const xpIconShine = useRef(new Animated.Value(0)).current;
  const starIconShine = useRef(new Animated.Value(0)).current;
  const playerFrame = useRef(new Animated.Value(0)).current;
  const crownRotate = useRef(new Animated.Value(0)).current;
  const randomStartOffsets = useRef({
    settings: 0,
    crown: 1100 + Math.random() * 600,
  }).current;
  const dropAnimations = useRef(
    navItems.map(() => new Animated.Value(-120)),
  ).current;
  const navButtonHeartbeats = useRef(
    navItems.map(() => new Animated.Value(1)),
  ).current;
  const profileCardScales = useRef(
    profileActionCards.map(() => new Animated.Value(1)),
  ).current;

  useEffect(() => {
    const createShine = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 720,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 1,
            useNativeDriver: true,
          }),
          Animated.delay(1900),
        ]),
      );
    const xpShineAnimation = createShine(xpIconShine, 350);
    const starShineAnimation = createShine(starIconShine, 1050);
    xpShineAnimation.start();
    starShineAnimation.start();

    return () => {
      xpShineAnimation.stop();
      starShineAnimation.stop();
    };
  }, [starIconShine, xpIconShine]);

  const selectedDob = accountDob
    ? new Date(`${accountDob}T12:00:00`)
    : new Date(2015, 0, 1);
  const formatDob = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  };

  const loadAccountDetails = async (existingToken?: string): Promise<boolean> => {
    try {
      const token = existingToken ?? await getCurrentAuthToken();
      if (!token) {
        return false;
      }

      const user = getUserPayload(await getUserMe(token));
      const storedDob = await AsyncStorage.getItem("kido.dob");
      const gradesResponse = await getGrades();
      const grades = Array.isArray(gradesResponse)
        ? gradesResponse
        : gradesResponse?.grades || [];
      const gradeId = user?.gradeId ?? user?.grade?.id;
      const schoolCode = String(user?.schoolCode ?? "");
      setAccountSchoolCode(schoolCode);
      if (schoolCode) {
        try {
          const schoolResult = await getSchoolByCode(schoolCode);
          setAccountSchool(schoolResult.school ?? null);
        } catch {
          setAccountSchool({ schoolCode, name: schoolCode, district: "", region: "" });
        }
      } else {
        setAccountSchool(null);
      }
      const matchingGrade = grades.find(
        (grade: { id: number | string; name: string }) =>
          String(grade.id) === String(gradeId),
      );
      setAccountGrades(grades);
      setAccountUserId(String(user?.userID ?? ""));
      setAccountEmail(String(user?.email ?? ""));
      setEmailVerified(user?.emailStatus === true);
      setHasPassword(user?.hasPassword === true);
      setAccountDob(getAccountDob(user) || storedDob || accountDob);
      setAccountGrade(String(gradeId ?? ""));
      setAccountGradeName(String(user?.grade?.name ?? matchingGrade?.name ?? ""));
      setSubscriptionStatus(
        String(
          user?.subscriptionStatus ??
            user?.subscription?.status ??
            "Not available",
        ),
      );
      return true;
    } catch (error) {
      setAccountError(getPlayLandErrorMessage(error, "Could not load your account."));
      return (error as { status?: number })?.status !== 401;
    }
  };

  const openAccountCard = async () => {
    playPopSound();
    setAccountError("");
    setNewPassword("");
    setConfirmNewPassword("");
    const token = await getCurrentAuthToken().catch(() => null);
    if (!token) {
      setAccountVisible(false);
      setOpenAccountAfterLogin(true);
      setLoginVisible(true);
      return;
    }
    setAccountVisible(true);
    const loaded = await loadAccountDetails(token);
    if (!loaded) {
      setAccountVisible(false);
      setOpenAccountAfterLogin(true);
      setLoginVisible(true);
    }
  };

  const saveAccount = async () => {
    const userID = accountUserId.trim();
    const email = accountEmail.trim();
    const dob = accountDob.trim();
    const grade = accountGrade.trim();

    if (!userID) {
      setAccountError("UserID cannot be empty.");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAccountError("Enter a valid email address or leave it empty.");
      return;
    }

    if (dob) {
      const parsedDob = new Date(`${dob}T00:00:00.000Z`);
      const validDob =
        /^\d{4}-\d{2}-\d{2}$/.test(dob) &&
        !Number.isNaN(parsedDob.getTime()) &&
        parsedDob.toISOString().slice(0, 10) === dob;

      if (!validDob) {
        setAccountError("Enter DOB in YYYY-MM-DD format or leave it empty.");
        return;
      }
    }

    try {
      setAccountSaving(true);
      setAccountError("");
      const token = await getCurrentAuthToken();
      if (!token) {
        throw new Error("Register or log in before editing your account.");
      }
      const selectedGrade = accountGrades.find(
        (gradeOption) => gradeOption.name === accountGradeName,
      );
      const gradeId = Number(selectedGrade?.id ?? accountGrade.trim());
      const accountChanges = {
        ...(email ? { email } : {}),
        ...(dob ? { DoB: `${dob}T00:00:00.000Z` } : {}),
        ...(grade && Number.isInteger(gradeId) ? { gradeId } : {}),
        schoolCode: accountSchoolCode || null,
      };
      const updatedUser = getUserPayload(await updateUserAccount(
        {
          userID,
          ...accountChanges,
        },
        token,
      ));
      await AsyncStorage.setItem("kido.userId", userID);
      if (dob) {
        await AsyncStorage.setItem("kido.dob", dob);
      }
      setAccountUserId(String(updatedUser?.userID ?? userID));
      setAccountEmail(String(updatedUser?.email ?? accountEmail));
      setEmailVerified(updatedUser?.emailStatus === true);
      setAccountDob(getAccountDob(updatedUser) || dob);
      setAccountGrade(
        String(updatedUser?.gradeId ?? updatedUser?.grade?.id ?? accountGrade),
      );
      setAccountGradeName(
        String(updatedUser?.grade?.name ?? accountGradeName),
      );
      setAccountSchoolCode(String(updatedUser?.schoolCode ?? accountSchoolCode));
      setAccountVisible(false);
    } catch (error) {
      setAccountError(getPlayLandErrorMessage(error, "Could not save your account."));
    } finally {
      setAccountSaving(false);
    }
  };

  const saveNewPassword = async () => {
    if (passwordSaving) return;
    if (newPassword.length < 8) {
      setAccountError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setAccountError("Passwords do not match.");
      return;
    }

    try {
      setPasswordSaving(true);
      setAccountError("");
      const token = await getCurrentAuthToken();
      if (!token) throw new Error("Log in to add a password to your account.");
      await addUserPassword(newPassword, token);
      setHasPassword(true);
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      setAccountError(getPlayLandErrorMessage(error, "Could not add your password."));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    if (logoutSaving) return;
    try {
      setLogoutSaving(true);
      setAccountError("");
      await logoutAuthSession();
      setRegistrationResetKey((key) => key + 1);
      setAccountVisible(false);
      setAccountUserId("");
      setAccountEmail("");
      setEmailVerified(false);
      setHasPassword(false);
      setAccountDob("");
      setAccountGrade("");
      setAccountGradeName("");
      setAccountSchoolCode("");
      setAccountSchool(null);
      setXp(0);
      setCoins(0);
      setStars(0);
      setGenreStats([]);
      setLoginVisible(true);
    } catch (error) {
      setAccountError(getPlayLandErrorMessage(error, "Could not log out. Please try again."));
    } finally {
      setLogoutSaving(false);
    }
  };

  const saveSchoolFromPrompt = async (school: SchoolOption) => {
    if (schoolPromptSaving) return;
    try {
      setSchoolPromptSaving(true);
      setSchoolPromptError("");
      const token = await getCurrentAuthToken();
      if (!token) throw new Error("Log in to save your school.");
      const updateResponse = await updateUserAccount({ schoolCode: school.schoolCode }, token);
      const updatedUser = getUserPayload(updateResponse);
      if (String(updatedUser?.schoolCode ?? "").toUpperCase() !== school.schoolCode.toUpperCase()) {
        throw new Error("Could not confirm that your school was saved. Please try again.");
      }
      setAccountSchoolCode(school.schoolCode);
      setAccountSchool(school);
      setSchoolPromptVisible(false);
    } catch (error) {
      setSchoolPromptError(error instanceof Error ? error.message : "Could not save your school.");
    } finally {
      setSchoolPromptSaving(false);
    }
  };

  const saveSchoolFromAccountPicker = async (school: SchoolOption) => {
    try {
      setAccountError("");
      const token = await getCurrentAuthToken();
      if (!token) throw new Error("Log in to save your school.");
      await updateUserAccount({ schoolCode: school.schoolCode }, token);
      setAccountSchool(school);
      setAccountSchoolCode(school.schoolCode);
      setAccountSchoolPickerOpen(false);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Could not save your school.");
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        // 1. Get stored auth token
        const token = await AsyncStorage.getItem("kido.authToken");
        const languageRevisionAtRequest = languageChangeRevision.current;

        // 2. Get numeric user ID from /users/me (requires auth)
        let numericUserId: number | undefined;
        if (token) {
          try {
            console.log(
              "[loadProfile] Attempting to fetch numeric ID from /users/me",
            );
            const userMe = getUserPayload(await getUserMe(token));
            console.log("[loadProfile] /users/me response:", userMe);
            if (mounted) {
              if ((userMe?.language === "EN" || userMe?.language === "SW") && languageRevisionAtRequest === languageChangeRevision.current) {
                setLanguage(userMe.language);
                void AsyncStorage.setItem(preferenceKeys.language, userMe.language);
              }
              setAccountUserId(String(userMe?.userID ?? ""));
              setAccountEmail(String(userMe?.email ?? ""));
              setEmailVerified(userMe?.emailStatus === true);
              const storedDob = await AsyncStorage.getItem("kido.dob");
              setAccountDob(getAccountDob(userMe) || storedDob || "");
              const gradeId = userMe?.gradeId ?? userMe?.grade?.id;
              let gradeName = String(userMe?.grade?.name ?? "");

              if (!gradeName && gradeId !== undefined && gradeId !== null) {
                try {
                  const gradesResponse = await getGrades();
                  const grades = Array.isArray(gradesResponse)
                    ? gradesResponse
                    : gradesResponse?.grades || [];
                  const matchingGrade = grades.find(
                    (grade: { id: number | string; name: string }) =>
                      String(grade.id) === String(gradeId),
                  );
                  gradeName = String(matchingGrade?.name ?? "");
                } catch {
                  // Keep the profile load working if the grade list is unavailable.
                }
              }

              setAccountGrade(String(gradeId ?? ""));
              if (gradeName) {
                setAccountGradeName(gradeName);
              }
              setSubscriptionStatus(
                String(
                  userMe?.subscriptionStatus ??
                    userMe?.subscription?.status ??
                    "Not available",
                ),
              );
            }
            if (userMe?.id !== undefined) {
              numericUserId = Number(userMe.id);
              console.log(
                "[loadProfile] Got numeric userId from /users/me:",
                numericUserId,
              );
              await AsyncStorage.setItem(
                "kido.numericUserId",
                String(numericUserId),
              );
            }
          } catch (err) {
            console.log("[loadProfile] /users/me failed:", err);
          }
        }

        if (mounted && !accountUserId) {
          const storedUserId = await AsyncStorage.getItem("kido.userId");
          if (storedUserId) {
            setAccountUserId(storedUserId);
          }
        }

        // 3. Fallback to stored numeric ID
        if (!numericUserId) {
          const stored = await AsyncStorage.getItem("kido.numericUserId");
          if (stored) {
            numericUserId = Number(stored);
            console.log(
              "[loadProfile] Using stored numeric userId:",
              numericUserId,
            );
          }
        }

        // 4. Last resort: try to resolve from username via /users list (no auth needed)
        if (!numericUserId) {
          const username = await AsyncStorage.getItem("kido.userId");
          if (username) {
            console.log(
              "[loadProfile] Attempting to resolve numeric ID from username:",
              username,
            );
            try {
              const users: any = await api.getUsers();
              const list = Array.isArray(users)
                ? users
                : users?.users || users?.data || [];
              const match = list.find(
                (u: any) => u.userID === username || u.userId === username,
              );
              if (match?.id) {
                numericUserId = Number(match.id);
                console.log(
                  "[loadProfile] Resolved numeric userId from users list:",
                  numericUserId,
                );
                await AsyncStorage.setItem(
                  "kido.numericUserId",
                  String(numericUserId),
                );
              }
            } catch (err) {
              console.log(
                "[loadProfile] Failed to resolve from users list:",
                err,
              );
            }
          }
        }

        if (!numericUserId) {
          console.log(
            "[loadProfile] No numeric userId available, cannot fetch profile",
          );
          return;
        }

        // 5. NOW fetch profile with CORRECT numeric ID
        console.log(
          "[loadProfile] Fetching profile for userId:",
          numericUserId,
        );
        const response = (await getUserGameProfile(numericUserId)) as any;
        console.log("[loadProfile] API response:", response);

        if (mounted && response?.success && response?.profile) {
          console.log("[loadProfile] Setting profile data:", response.profile);
          const coinsVal = response.profile.coins || 0;
          let xpVal = 0;
          let starsVal = 0;

          if (token) {
            const [progressResponse, challengeResponse, giftRecords]: [any, any, any[]] = await Promise.all([
              getUserLevelProgress(token),
              getUserChallenges(token),
              getAllUserGifts(numericUserId, token).catch(() => []),
            ]);
            const progressRecords = Array.isArray(progressResponse)
              ? progressResponse
              : progressResponse?.progress ??
                progressResponse?.progresses ??
                progressResponse?.data?.progress ??
                progressResponse?.data?.progresses ??
                progressResponse?.data ??
                [];
            const challengeRecords = Array.isArray(challengeResponse)
              ? challengeResponse
              : challengeResponse?.userChallenges ??
                challengeResponse?.data?.userChallenges ??
                [];

            if (Array.isArray(progressRecords)) {
              xpVal = progressRecords.reduce(
                (total: number, record: any) =>
                  total + Number(record?.bestScore ?? record?.score ?? record?.px ?? 0),
                0,
              );
              starsVal = progressRecords.reduce(
                (total: number, record: any) =>
                  total + Number(record?.stars ?? 0),
                0,
              );
            }
            if (Array.isArray(giftRecords)) {
              xpVal += giftRecords.reduce((total: number, record: any) => total + Number(record?.gift?.pointsAwarded ?? 0), 0);
              starsVal += giftRecords.reduce((total: number, record: any) => total + Number(record?.gift?.starsAwarded ?? 0), 0);
            }
            if (Array.isArray(challengeRecords)) {
              xpVal += challengeRecords.reduce(
                (total: number, record: any) => total + (record?.claimed === true ? Number(record?.pointsEarned ?? 0) : 0),
                0,
              );
              starsVal += challengeRecords.reduce(
                (total: number, record: any) => total + (record?.claimed === true ? Number(record?.starsEarned ?? 0) : 0),
                0,
              );
            }
          }

          xpVal = Math.max(xpVal, Number(response.profile.xp) || 0);
          starsVal = Math.max(starsVal, Number(response.profile.stars) || 0);
          setXp(xpVal);
          setCoins(coinsVal);
          setStars(starsVal);
          setGenreStats(Array.isArray(response.profile.genreStats) ? response.profile.genreStats : []);

          try {
            await AsyncStorage.multiSet([
              ["kido.xp", String(xpVal)],
              ["kido.coins", String(coinsVal)],
              ["kido.stars", String(starsVal)],
            ]);
          } catch {
            // ignore storage errors
          }
        } else {
          console.log("[loadProfile] Invalid response structure:", response);
        }
      } catch (error) {
        console.error("[loadProfile] Error fetching profile:", error);
        // Fall back to AsyncStorage for ALL fields if API fails
        try {
          const [storedXp, storedCoins, storedStars] =
            await AsyncStorage.multiGet([
              "kido.xp",
              "kido.coins",
              "kido.stars",
            ]);
          if (mounted) {
            if (storedXp[1] != null) {
              const n = Number(storedXp[1]);
              if (!Number.isNaN(n)) {
                console.log("[loadProfile] Setting xp from storage:", n);
                setXp(n);
              }
            }
            if (storedCoins[1] != null) {
              const n = Number(storedCoins[1]);
              if (!Number.isNaN(n)) {
                console.log("[loadProfile] Setting coins from storage:", n);
                setCoins(n);
              }
            }
            if (storedStars[1] != null) {
              const n = Number(storedStars[1]);
              if (!Number.isNaN(n)) {
                console.log("[loadProfile] Setting stars from storage:", n);
                setStars(n);
              }
            }
          }
        } catch {
          // ignore
        }
      }
    };

    AsyncStorage.multiGet([preferenceKeys.theme, preferenceKeys.language])
      .then(([storedTheme, storedLanguage]) => {
        if (!mounted) {
          return;
        }

        if (storedTheme[1] === "dark" || storedTheme[1] === "day") {
          setTheme(storedTheme[1]);
        }
        if (storedLanguage[1] === "SW" || storedLanguage[1] === "EN") {
          setLanguage(storedLanguage[1]);
        }
        void loadAccountDetails();
        void loadProfile();
        setPreferencesLoaded(true);
      })
      .catch(() => {
        // Keep the defaults if local preference storage is unavailable.
        if (mounted) {
          setPreferencesLoaded(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(sunY, {
        toValue: theme === "dark" ? 170 : 0,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sunOpacity, {
        toValue: theme === "dark" ? 0 : 1,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sunScale, {
        toValue: theme === "dark" ? 0.65 : 1,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(moonOpacity, {
        toValue: theme === "dark" ? 1 : 0,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(moonY, {
        toValue: theme === "dark" ? 110 : -260,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [theme, moonOpacity, moonY, sunOpacity, sunScale, sunY]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const token = await getCurrentAuthToken();
        if (!token) return;
        try {
          const user = getUserPayload(await getUserMe(token));
          if (!active) return;
          const schoolCode = String(user?.schoolCode ?? "");
          setAccountSchoolCode(schoolCode);
          if (schoolCode) {
            setSchoolPromptVisible(false);
            try {
              const result = await getSchoolByCode(schoolCode);
              if (active) setAccountSchool(result.school ?? null);
            } catch {
              if (active) {
                setAccountSchool({ schoolCode, name: schoolCode, district: "", region: "" });
              }
            }
          } else {
            setAccountSchool(null);
            const userKey = String(user?.id ?? user?.userID ?? "unknown");
            const promptStateKey = `kido.schoolPrompt.${userKey}`;
            const nextVisit = await AsyncStorage.getItem(promptStateKey);
            if (!active) return;
            const shouldShowPrompt = nextVisit !== "skip";
            setSchoolPromptVisible(shouldShowPrompt);
            await AsyncStorage.setItem(promptStateKey, shouldShowPrompt ? "skip" : "show");
          }
        } catch {
          // Do not interrupt Home if account details cannot be refreshed.
        }
      })();
      return () => { active = false; };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void AsyncStorage.getItem("kido.numericUserId").then(async (storedId) => {
        if (!storedId) return;
        try {
          const result = await getUserGameProfile(storedId);
          if (!active || !result?.profile) return;
          const profile = result.profile;
          setXp(Number(profile.xp) || 0);
          setStars(Number(profile.stars) || 0);
          setCoins(Number(profile.coins) || 0);
          setGenreStats(Array.isArray(profile.genreStats) ? profile.genreStats : []);
          await AsyncStorage.multiSet([
            ["kido.xp", String(Number(profile.xp) || 0)],
            ["kido.stars", String(Number(profile.stars) || 0)],
            ["kido.coins", String(Number(profile.coins) || 0)],
          ]);
        } catch {
          // Keep cached home totals if the profile endpoint is temporarily unavailable.
        }
      }).catch(() => undefined);
      return () => { active = false; };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (!preferencesLoaded || !audioPreferencesLoaded) return;

      const configureBackgroundAudio = async () => {
        try {
          await setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: false,
            interruptionMode: "mixWithOthers",
          });
        } catch {
          // Audio mode setup can fail when the native audio session is unavailable.
        }
      };

      const player = getBackgroundPlayer();
      void configureBackgroundAudio();
      let removeWebGestureListeners: () => void = () => {};

      if (
        isWeb &&
        musicEnabled &&
        !webBackgroundAudioUnlocked &&
        typeof document !== "undefined"
      ) {
        const startMusicAfterGesture = () => {
          webBackgroundAudioUnlocked = true;
          document.removeEventListener("pointerdown", startMusicAfterGesture);
          document.removeEventListener("keydown", startMusicAfterGesture);
          try {
            player.seekTo(0);
            player.play();
          } catch {
            // Ignore browser audio failures after a user gesture.
          }
        };
        document.addEventListener("pointerdown", startMusicAfterGesture);
        document.addEventListener("keydown", startMusicAfterGesture);
        removeWebGestureListeners = () => {
          document.removeEventListener("pointerdown", startMusicAfterGesture);
          document.removeEventListener("keydown", startMusicAfterGesture);
        };
      } else if (musicEnabled && (!isWeb || webBackgroundAudioUnlocked)) {
        try {
          if (!player.playing) {
            player.seekTo(0);
            player.play();
          }
        } catch {
          // Ignore released shared audio objects during fast navigation changes.
        }
      }

      const appStateSubscription = AppState.addEventListener(
        "change",
        (nextState) => {
          if (nextState === "active") {
            if (musicEnabled && (!isWeb || webBackgroundAudioUnlocked)) {
              try {
                player.play();
              } catch {
                // Ignore released shared audio objects after returning to the app.
              }
            }
            return;
          }

          stopBackgroundMusic();
        },
      );

      return () => {
        appStateSubscription.remove();
        removeWebGestureListeners();
        stopBackgroundMusic();
      };
    }, [audioPreferencesLoaded, isWeb, musicEnabled, preferencesLoaded]),
  );

  useEffect(() => {
    const animations = navItems.map((_, index) => {
      const firstCardLast = navItems.length - 1 - index;
      return Animated.sequence([
        Animated.delay(index * 180 + 80),
        Animated.spring(dropAnimations[firstCardLast], {
          toValue: 0,
          friction: 5,
          tension: 140,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start();
  }, [dropAnimations]);

  useEffect(() => {
    const settingsAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(randomStartOffsets.settings),
        Animated.timing(new Animated.Value(0), {
          toValue: 0,
          duration: 1,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(1100 + Math.random() * 1600),
      ]),
    );

    const crownAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(randomStartOffsets.crown),
        Animated.timing(new Animated.Value(0), {
          toValue: 0,
          duration: 1,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(5000),
      ]),
    );

    const settingsPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(settingsScale, {
          toValue: 1.06,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(settingsScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const starAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(new Animated.Value(0), {
          toValue: 0,
          duration: 1,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(1900),
      ]),
    );

    const starPulse = Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(starScale, {
          toValue: 1.06,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(starScale, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(1900),
      ]),
    );

    settingsAnimation.start();
    crownAnimation.start();
    settingsPulse.start();
    starAnimation.start();
    starPulse.start();

    return () => {
      settingsAnimation.stop();
      crownAnimation.stop();
      settingsPulse.stop();
      starAnimation.stop();
      starPulse.stop();
    };
  }, [crownRotate, randomStartOffsets, settingsScale, starScale]);

  useEffect(() => {
    const spriteAnimation = Animated.loop(
      Animated.sequence(
        Array.from({ length: playerSpriteFrameCount }, (_, frame) =>
          Animated.sequence([
            Animated.timing(playerFrame, {
              toValue: frame,
              duration: 1,
              useNativeDriver: true,
            }),
            Animated.delay(
              frame === 0 ? 1000 : 120,
            ),
          ]),
        ),
      ),
    );

    spriteAnimation.start();

    return () => {
      spriteAnimation.stop();
    };
  }, []);

  useEffect(() => {
    const animations = navItems.map((_, index) => {
      const heartbeatAnimation = Animated.loop(
        Animated.sequence([
          Animated.delay(index * 220),
          Animated.timing(navButtonHeartbeats[index], {
            toValue: 1.08,
            duration: 180,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(navButtonHeartbeats[index], {
            toValue: 0.96,
            duration: 120,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(navButtonHeartbeats[index], {
            toValue: 1.12,
            duration: 150,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(navButtonHeartbeats[index], {
            toValue: 1,
            duration: 260,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(1100),
        ]),
      );

      heartbeatAnimation.start();
      return heartbeatAnimation;
    });

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [navButtonHeartbeats]);

  useEffect(() => {
    const animations = profileCardScales.filter(Boolean).map((scale, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 260),
          Animated.timing(scale, {
            toValue: 1.06,
            duration: 520,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 520,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(1500),
        ]),
      ),
    );

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [profileCardScales]);

  useEffect(() => {
    const startX = 300;
    const peakX = -50;
    const endX = -(width + 360);
    const peakY = -20;
    const landingY = 80;

    const parrotAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(parrotX, {
            toValue: startX,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(parrotY, {
            toValue: 32,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(parrotRotate, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(parrotX, {
            toValue: peakX,
            duration: 6900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(parrotY, {
            toValue: peakY,
            duration: 6900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(parrotRotate, {
            toValue: -18,
            duration: 6900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(parrotX, {
            toValue: endX,
            duration: 14400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(parrotY, {
            toValue: landingY,
            duration: 14400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(parrotRotate, {
            toValue: 22,
            duration: 14400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(parrotX, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(parrotY, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(parrotRotate, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    parrotAnimation.start();

    return () => {
      parrotAnimation.stop();
    };
  }, [parrotRotate, parrotX, parrotY, width]);

  const [fontsLoaded] = useFonts({
    FredokaRegular: require("../assets/fonts/Fredoka-Regular.ttf"),
    FredokaMedium: require("../assets/fonts/Fredoka-Medium.ttf"),
    FredokaBold: require("../assets/fonts/Fredoka-Bold.ttf"),
  });

  if (!fontsLoaded) {
    return <ActivityIndicator size="large" color="#fff" />;
  }

  return (
    <ImageBackground
      source={
        theme === "dark"
          ? require("../assets/night.background.png")
          : require("../assets/background.png")
      }
      style={[styles.background, isWeb && { pointerEvents: "none" }]}
      resizeMode="cover"
      accessible={false}
      importantForAccessibility="no"
    >
      <SettingsCard
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        theme={theme}
        language={language}
        onLanguageChange={handleLanguageChange}
        onThemeChange={(nextTheme) => {
          setTheme(nextTheme);
          void AsyncStorage.setItem(preferenceKeys.theme, nextTheme);
        }}
        soundEnabled={soundEnabled}
        musicEnabled={musicEnabled}
        onSoundChange={(enabled) => {
          setSoundEnabled(enabled);
        }}
        onMusicChange={(enabled) => {
          setMusicEnabled(enabled);
        }}
      />
      <RegisterCard
        key={registrationResetKey}
        visible={registerVisible}
        gradeOnly
        onClose={() => setRegisterVisible(false)}
        onLoginPress={() => {
          setRegisterVisible(false);
          setLoginVisible(true);
        }}
        onSubmit={() => {
          setRegisterVisible(false);
          router.push("/play");
        }}
      />
      <LoginCard
        visible={loginVisible}
        darkMode={theme === "dark"}
        onClose={() => {
          setLoginVisible(false);
          setOpenAccountAfterLogin(false);
        }}
        onSuccess={() => {
          setLoginVisible(false);
          if (openAccountAfterLogin) {
            setOpenAccountAfterLogin(false);
            void openAccountCard();
          } else {
            router.push("/play");
          }
        }}
      />
      <Modal
        visible={accountVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountVisible(false)}
      >
        <View style={styles.accountModalBackdrop}>
          <View style={[styles.accountCard, styles.accountCardScrollable, theme === "dark" && styles.darkAccountCard]}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <AppText style={[styles.accountTitle, theme === "dark" && styles.darkAccountText]}>
              Your account
            </AppText>
            <AppText style={[styles.accountLabel, theme === "dark" && styles.darkAccountLabel]}>
              UserID
            </AppText>
            <AppTextInput
              value={accountUserId}
              onChangeText={setAccountUserId}
              style={[styles.accountInput, theme === "dark" && styles.darkAccountInput]}
              autoCapitalize="none"
              placeholder="UserID"
              placeholderTextColor="#9a7a4a"
            />
            <AppText style={[styles.accountLabel, theme === "dark" && styles.darkAccountLabel]}>Grade</AppText>
            <Pressable
              onPress={() => setGradeMenuOpen((isOpen) => !isOpen)}
              style={[styles.accountSelect, theme === "dark" && styles.darkAccountInput]}
            >
              <AppText style={[styles.accountSelectText, theme === "dark" && styles.darkAccountText]}>
                {accountGradeName || "Select grade"}
              </AppText>
            </Pressable>
            {gradeMenuOpen && (
              <View style={[styles.accountGradeMenu, theme === "dark" && styles.darkAccountInput]}>
                {accountGrades.map((gradeOption) => (
                  <Pressable
                    key={String(gradeOption.id)}
                    onPress={() => {
                      setAccountGrade(String(gradeOption.id));
                      setAccountGradeName(gradeOption.name);
                      setGradeMenuOpen(false);
                    }}
                    style={[styles.accountGradeOption, theme === "dark" && styles.darkAccountOption]}
                  >
                    <AppText style={[styles.accountSelectText, theme === "dark" && styles.darkAccountText]}>
                      {gradeOption.name}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            )}
            <AppText style={[styles.accountLabel, theme === "dark" && styles.darkAccountLabel]}>School</AppText>
            <View style={styles.schoolAccountRow}>
              <Pressable
                onPress={() => setAccountSchoolPickerOpen(true)}
                style={[styles.accountSelect, styles.schoolAccountSelect, theme === "dark" && styles.darkAccountInput]}
              >
                <AppText style={[accountSchool ? styles.accountSelectText : styles.accountPlaceholder, theme === "dark" && styles.darkAccountText]} numberOfLines={1}>
                  {accountSchool?.name || "Select school (optional)"}
                </AppText>
              </Pressable>
              {accountSchoolCode ? (
                <Pressable
                  onPress={() => {
                    setAccountSchoolCode("");
                    setAccountSchool(null);
                  }}
                  style={[styles.schoolClearButton, theme === "dark" && styles.darkAccountCancel]}
                  accessibilityLabel="Clear selected school"
                >
                  <AppText style={[styles.accountCancelText, theme === "dark" && styles.darkAccountText]}>×</AppText>
                </Pressable>
              ) : null}
            </View>
            <AppText style={[styles.accountLabel, theme === "dark" && styles.darkAccountLabel]}>Email</AppText>
            <AppTextInput
              value={accountEmail}
              onChangeText={(email) => {
                setAccountEmail(email);
                setEmailVerified(false);
              }}
              style={[styles.accountInput, theme === "dark" && styles.darkAccountInput]}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor="#9a7a4a"
            />
            <AccountRow
              label="Email status"
              value={emailVerified ? "Verified" : "Unverified"}
              darkMode={theme === "dark"}
            />
            <AppText style={[styles.accountLabel, theme === "dark" && styles.darkAccountLabel]}>
              {hasPassword ? "Password" : "Add password"}
            </AppText>
            {hasPassword ? (
              <AppText style={[styles.accountValue, styles.passwordEnabledText, theme === "dark" && styles.darkAccountText]}>
                Password sign-in is enabled
              </AppText>
            ) : (
              <>
                <AppTextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  style={[styles.accountInput, theme === "dark" && styles.darkAccountInput]}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#9a7a4a"
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                  accessibilityLabel="New password"
                />
                <AppTextInput
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  style={[styles.accountInput, theme === "dark" && styles.darkAccountInput]}
                  placeholder="Confirm password"
                  placeholderTextColor="#9a7a4a"
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                  accessibilityLabel="Confirm new password"
                />
                <Pressable
                  onPress={() => void saveNewPassword()}
                  style={[styles.accountSave, styles.addPasswordButton, theme === "dark" && styles.darkAccountSave]}
                  disabled={passwordSaving || !newPassword || !confirmNewPassword}
                >
                  <AppText style={[styles.accountSaveText, theme === "dark" && styles.darkAccountText]}>
                    {passwordSaving ? "Adding password..." : "Add password"}
                  </AppText>
                </Pressable>
              </>
            )}
            <AppText style={[styles.accountLabel, theme === "dark" && styles.darkAccountLabel]}>DOB</AppText>
            <Pressable
              onPress={() => setDobPickerVisible(true)}
              style={[styles.accountSelect, theme === "dark" && styles.darkAccountInput]}
              accessibilityRole="button"
              accessibilityLabel="Select date of birth"
            >
              <AppText style={[
                accountDob ? styles.accountSelectText : styles.accountPlaceholder,
                theme === "dark" && styles.darkAccountText,
              ]}>
                {accountDob || "Select date"}
              </AppText>
            </Pressable>
            {dobPickerVisible && (
              <DateTimePicker
                value={selectedDob}
                mode="date"
                display="calendar"
                maximumDate={new Date()}
                onValueChange={(event: any, selectedDate?: Date) => {
                  if (Platform.OS === "android") {
                    setDobPickerVisible(false);
                  }
                  const value = selectedDate ?? event?.nativeEvent?.timestamp;
                  if (!value) return;
                  let date: Date;
                  if (value instanceof Date) {
                    date = value;
                  } else if (typeof value === "number") {
                    date = new Date(value);
                  } else {
                    const timestamp =
                      value?.nativeEvent?.timestamp ?? value?.timestamp;
                    date = new Date(timestamp);
                  }
                  if (!Number.isNaN(date.getTime())) {
                    const formattedDob = formatDob(date);
                    setAccountDob(formattedDob);
                    void AsyncStorage.setItem("kido.dob", formattedDob);
                  }
                }}
                onDismiss={() => setDobPickerVisible(false)}
              />
            )}
            {dobPickerVisible && Platform.OS === "ios" && (
              <Pressable
                style={styles.dateDoneButton}
                onPress={() => setDobPickerVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Done selecting date of birth"
              >
                <AppText style={styles.dateDoneText}>Done</AppText>
              </Pressable>
            )}
            <AccountRow label="Subscription" value={subscriptionStatus} darkMode={theme === "dark"} />
            {accountError ? (
              <AppText style={styles.accountError}>{accountError}</AppText>
            ) : null}
            <View style={styles.accountActions}>
              <Pressable
                onPress={() => {
                  playPopSound();
                  setAccountVisible(false);
                }}
                style={[styles.accountCancel, theme === "dark" && styles.darkAccountCancel]}
              >
                <AppText style={[styles.accountCancelText, theme === "dark" && styles.darkAccountText]}>Cancel</AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  playPopSound();
                  void saveAccount();
                }}
                style={[styles.accountSave, theme === "dark" && styles.darkAccountSave]}
                disabled={accountSaving}
              >
                <AppText style={[styles.accountSaveText, theme === "dark" && styles.darkAccountText]}>
                  {accountSaving ? "Saving..." : "Save"}
                </AppText>
              </Pressable>
            </View>
            <Pressable
              onPress={() => void handleLogout()}
              style={[styles.accountLogout, theme === "dark" && styles.darkAccountLogout]}
              disabled={logoutSaving}
              accessibilityRole="button"
              accessibilityLabel="Log out of this account"
            >
              <AppText style={styles.accountLogoutText}>
                {logoutSaving ? "Logging out..." : "Log out"}
              </AppText>
            </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={accountSchoolPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountSchoolPickerOpen(false)}
      >
        <View style={styles.accountModalBackdrop}>
          <View style={[styles.accountCard, styles.schoolPickerCard, theme === "dark" && styles.darkAccountCard]}>
            <View style={styles.schoolPickerHeader}>
              <AppText style={[styles.accountTitle, styles.schoolPickerTitle, theme === "dark" && styles.darkAccountText]}>Select school</AppText>
              <Pressable
                onPress={() => setAccountSchoolPickerOpen(false)}
                style={[styles.schoolPickerClose, theme === "dark" && styles.darkAccountCancel]}
              >
                <AppText style={[styles.accountCancelText, theme === "dark" && styles.darkAccountText]}>×</AppText>
              </Pressable>
            </View>
            <SchoolPicker
              selectedSchool={accountSchool}
              darkMode={theme === "dark"}
              onSelect={(school) => void saveSchoolFromAccountPicker(school)}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={schoolPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSchoolPromptVisible(false)}
      >
        <View style={styles.accountModalBackdrop}>
          <View style={[styles.accountCard, styles.schoolPickerCard, theme === "dark" && styles.darkAccountCard]}>
            <View style={styles.schoolPickerHeader}>
              <AppText style={[styles.accountTitle, styles.schoolPickerTitle, theme === "dark" && styles.darkAccountText]}>{language === "SW" ? "Unasoma shule gani?" : "What school do you go to?"}</AppText>
              <Pressable
                onPress={() => setSchoolPromptVisible(false)}
                style={[styles.schoolPickerClose, theme === "dark" && styles.darkAccountCancel]}
                accessibilityLabel="Dismiss school reminder"
              >
                <AppText style={[styles.accountCancelText, theme === "dark" && styles.darkAccountText]}>×</AppText>
              </Pressable>
            </View>
            <SchoolPicker
              darkMode={theme === "dark"}
              onSelect={(school) => void saveSchoolFromPrompt(school)}
            />
            {schoolPromptError ? <AppText style={styles.accountError}>{schoolPromptError}</AppText> : null}
            {schoolPromptSaving ? <AppText style={styles.schoolPromptSaving}>Saving school...</AppText> : null}
            <Pressable
              onPress={() => setSchoolPromptVisible(false)}
              style={[styles.accountCancel, styles.schoolPromptDismiss, theme === "dark" && styles.darkAccountCancel]}
              disabled={schoolPromptSaving}
            >
              <AppText style={[styles.accountCancelText, theme === "dark" && styles.darkAccountText]}>Not now</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={rewardsBreakdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRewardsBreakdownVisible(false)}
      >
        <View style={styles.accountModalBackdrop}>
          <View style={[styles.rewardsCard, theme === "dark" && styles.darkAccountCard]}>
            <AppText style={[styles.accountTitle, theme === "dark" && styles.darkAccountText]}>Rewards by subject</AppText>
            <View style={styles.rewardsSummary}>
              <View style={styles.rewardsSummaryItem}>
                <View style={styles.rewardsIconWrap}>
                  <Image source={require("../assets/lightning.png")} style={styles.rewardsIcon} resizeMode="contain" />
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.iconShine,
                      {
                        opacity: xpIconShine.interpolate({ inputRange: [0, 0.45, 0.55, 1], outputRange: [0, 0.78, 0.78, 0] }),
                        transform: [{ translateX: xpIconShine.interpolate({ inputRange: [0, 1], outputRange: [-32, 32] }) }, { rotate: "28deg" }],
                      },
                    ]}
                  />
                </View>
                <AppText style={[styles.rewardsSummaryText, theme === "dark" && styles.darkAccountText]}>{xp} XP</AppText>
              </View>
              <View style={styles.rewardsSummaryItem}>
                <View style={styles.rewardsIconWrap}>
                  <Image source={require("../assets/star.png")} style={styles.rewardsIcon} resizeMode="contain" />
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.iconShine,
                      {
                        opacity: starIconShine.interpolate({ inputRange: [0, 0.45, 0.55, 1], outputRange: [0, 0.82, 0.82, 0] }),
                        transform: [{ translateX: starIconShine.interpolate({ inputRange: [0, 1], outputRange: [-32, 32] }) }, { rotate: "28deg" }],
                      },
                    ]}
                  />
                </View>
                <AppText style={[styles.rewardsSummaryText, theme === "dark" && styles.darkAccountText]}>{stars} stars</AppText>
              </View>
            </View>
            <ScrollView style={styles.rewardsList}>
              {genreStats.length ? genreStats.map((genre) => (
                <View key={genre.genreId} style={[styles.genreRewardRow, theme === "dark" && styles.darkGenreRewardRow]}>
                  <AppText style={[styles.genreRewardName, theme === "dark" && styles.darkAccountText]}>{genre.genreName}</AppText>
                  <View style={styles.genreRewardValues}>
                    <Image source={require("../assets/lightning.png")} style={styles.genreRewardIcon} resizeMode="contain" />
                    <AppText style={[styles.genreRewardValue, theme === "dark" && styles.darkAccountText]}>{genre.xp} XP</AppText>
                    <Image source={require("../assets/star.png")} style={styles.genreRewardIcon} resizeMode="contain" />
                    <AppText style={[styles.genreRewardValue, theme === "dark" && styles.darkAccountText]}>{genre.stars}</AppText>
                  </View>
                </View>
              )) : (
                <AppText style={[styles.genreRewardEmpty, theme === "dark" && styles.darkAccountLabel]}>No subject rewards yet. Pass a level to see its rewards here.</AppText>
              )}
            </ScrollView>
            <Pressable
              onPress={() => {
                playPopSound();
                setRewardsBreakdownVisible(false);
              }}
              style={[styles.accountSave, styles.rewardsCloseButton, theme === "dark" && styles.darkAccountSave]}
            >
              <AppText style={[styles.accountSaveText, theme === "dark" && styles.darkAccountText]}>Done</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Animated.View
        style={[
          styles.sunWrap,
          isWeb && { width: 180, height: 180 },
          {
            opacity: sunOpacity,
            transform: [
              { translateY: sunY },
              { scale: sunScale },
              { translateX: theme === "dark" ? 8 : -26 },
            ],
          },
        ]}
      >
        <LottieView
          source={require("../assets/sun.json")}
          autoPlay
          loop
          resizeMode="contain"
          style={[styles.sunAnimation, isWeb && { width: 240, height: 240 }]}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.moonWrap,
          {
            opacity: moonOpacity,
            transform: [
              { translateY: moonY },
              { translateX: theme === "dark" ? -10 : 0 },
            ],
          },
        ]}
      >
        <Image
          source={require("../assets/moon (1).png")}
          style={styles.moonImage}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.parrotWrap,
          {
            transform: [
              { translateX: parrotX },
              { translateY: parrotY },
              {
                rotate: parrotRotate.interpolate({
                  inputRange: [-12, 12],
                  outputRange: ["-8deg", "8deg"],
                }),
              },
            ],
          },
        ]}
      >
        <LottieView
          source={require("../assets/animals/parrot.json")}
          autoPlay
          loop
          resizeMode="contain"
          style={styles.parrotAnimation}
        />
      </Animated.View>

      <SafeAreaView style={isWeb ? [styles.safeArea, { pointerEvents: "auto" }] : styles.safeArea}>
        <View style={styles.headerArea}>
          <View style={styles.header}>
            <View style={styles.profileCluster}>
              <ProfileGradeCard
                isWeb={isWeb}
                grade={accountGradeName || "Loading..."}
                date={accountDob}
                verticalOffset={-30}
                horizontalOffset={-20}
                onPress={openAccountCard}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View subject rewards"
                onPress={() => {
                  playPopSound();
                  setRewardsBreakdownVisible(true);
                }}
              >
                <View style={[styles.xpWrap, isWeb && styles.webXpWrap, theme === "dark" && styles.darkXpWrap]}>
                <View style={[styles.jewelIconWrap, styles.xpJewelWrap]}>
                  <Image
                    source={require("../assets/lightning.png")}
                    style={styles.xpIcon}
                    resizeMode="contain"
                  />
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.iconShine,
                      {
                        opacity: xpIconShine.interpolate({
                          inputRange: [0, 0.45, 0.55, 1],
                          outputRange: [0, 0.78, 0.78, 0],
                        }),
                        transform: [
                          {
                            translateX: xpIconShine.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-32, 32],
                            }),
                          },
                          { rotate: "28deg" },
                        ],
                      },
                    ]}
                  />
                </View>
                <View style={styles.xpBadge}>
                  <AppText style={[styles.xpText, theme === "dark" && styles.darkXpText]}>
                    {xp}
                  </AppText>
                </View>
                </View>
              </Pressable>
            </View>

            <View style={styles.dailyBadge}>
              <View style={styles.iconStack}>
                <Animated.View
                  style={[
                    styles.settingsShell,
                    {
                      transform: [{ scale: settingsScale }],
                    },
                  ]}
                >
                  <Pressable
                    style={[
                      styles.settingsWrap,
                      theme === "dark" && styles.darkSettingsWrap,
                    ]}
                    accessibilityRole="button"
                    onPress={() => {
                      playPopSound();
                      setSettingsVisible(true);
                    }}
                  >
                    <Image
                      source={require("../assets/settings.png")}
                      style={styles.dailyBadgeIcon}
                      resizeMode="contain"
                    />
                  </Pressable>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.starShell,
                    isWeb && styles.webBadgeShell,
                    {
                      transform: [{ scale: starScale }],
                    },
                  ]}
                >
                  <Pressable
                    style={[
                      styles.coinWrap,
                      isWeb && styles.webBadgeWrap,
                      theme !== "dark" && styles.dayBadgeWrap,
                    ]}
                    accessibilityRole="button"
                    onPress={() => {
                      playPopSound();
                      setRewardsBreakdownVisible(true);
                    }}
                  >
                    <View style={styles.jewelIconWrap}>
                      <Image
                        source={require("../assets/star.png")}
                        style={styles.dailyBadgeIcon}
                        resizeMode="contain"
                      />
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.iconShine,
                          {
                            opacity: starIconShine.interpolate({
                              inputRange: [0, 0.45, 0.55, 1],
                              outputRange: [0, 0.82, 0.82, 0],
                            }),
                            transform: [
                              {
                                translateX: starIconShine.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [-32, 32],
                                }),
                              },
                              { rotate: "28deg" },
                            ],
                          },
                        ]}
                      />
                    </View>
                  </Pressable>
                  <View
                    style={[
                      styles.counterBadge,
                      theme !== "dark" && styles.dayCounterBadge,
                    ]}
                  >
                    <AppText
                      style={[
                        styles.counterText,
                        theme !== "dark" && styles.dayCounterText,
                      ]}
                    >
                      {stars}
                    </AppText>
                  </View>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.crownShell,
                    isWeb && styles.webBadgeShell,
                    {
                      transform: [{ scale: 1 }],
                    },
                  ]}
                >
                  <Pressable
                    style={[
                      styles.crownWrap,
                      isWeb && styles.webBadgeWrap,
                      theme !== "dark" && styles.dayBadgeWrap,
                    ]}
                    accessibilityRole="button"
                    onPress={() => {
                      playPopSound();
                      router.push("/leaderboard");
                    }}
                  >
                    <LeaderboardAnimation />
                  </Pressable>
                  <View
                    style={[
                      styles.rankBadge,
                      theme !== "dark" && styles.dayRankBadge,
                    ]}
                  >
                    <AppText
                      style={[
                        styles.rankText,
                        theme !== "dark" && styles.dayCounterText,
                      ]}
                    >
                      Rank
                    </AppText>
                  </View>
                </Animated.View>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.profileActionCards,
              isWeb && styles.webProfileActionCards,
            ]}
          >
            {profileActionCards.map((card, index) => (
              <Pressable
                key={card.key}
                accessibilityRole={
                  card.key === "streak" || card.key === "gift" || card.key === "skin"
                    ? "button"
                    : undefined
                }
                style={{ width: "100%", zIndex: 10, elevation: 10, pointerEvents: "auto" }}
                onPress={
                  card.key === "streak"
                    ? () => {
                        playPopSound();
                        router.push("/streak");
                      }
                    : card.key === "challenge"
                      ? () => {
                          playPopSound();
                          router.push("/challenge");
                        }
                      : card.key === "gift"
                        ? () => {
                            playPopSound();
                            router.push("/gift");
                          }
                        : undefined
                }
              >
                <Animated.View
                  style={[
                    styles.profileActionCard,
                    theme !== "dark" && styles.dayProfileActionCard,
                    {
                      transform: [{ scale: profileCardScales[index] ?? 1 }],
                      zIndex: 10,
                    },
                  ]}
                >
                  <Image
                    source={card.source}
                    style={styles.profileActionIcon}
                    resizeMode="contain"
                  />
                  <View style={styles.profileActionText}>
                    <AppText
                      style={[
                        styles.profileActionLabel,
                        theme !== "dark" && styles.dayProfileActionText,
                      ]}
                    >
                      {card.label}
                    </AppText>
                    <AppText
                      style={[
                        styles.profileActionSubtitle,
                        theme !== "dark" && styles.dayProfileActionSubtitle,
                      ]}
                    >
                      {card.subtitle}
                    </AppText>
                  </View>
                </Animated.View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.content, isWeb && { pointerEvents: "none" }]}>
          <View style={[styles.navigationGrid, isWeb && { pointerEvents: "none" }]}>
            {navItems.map((item, index) => (
              <Animated.View
                key={item.label}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  transform: [{ translateY: dropAnimations[index] }],
                }}
              >
                {item.label === "Play" && (
                  <View style={styles.playPlayerImage}>
                    <View style={styles.playerSpriteViewport}>
                      <Animated.Image
                        source={require("../assets/players/player-idle.png")}
                        style={[
                          styles.playerSpriteImage,
                          {
                            transform: [
                              {
                                translateX: playerFrame.interpolate({
                                  inputRange: playerSpriteFrameInputRange,
                                  outputRange: playerSpriteFrameX,
                                }),
                              },
                              {
                                translateY: playerFrame.interpolate({
                                  inputRange: playerSpriteFrameInputRange,
                                  outputRange: playerSpriteFrameY,
                                }),
                              },
                            ],
                          },
                        ]}
                        resizeMode="stretch"
                      />
                    </View>
                  </View>
                )}
                <Animated.View
                  style={{ transform: [{ scale: navButtonHeartbeats[index] }] }}
                >
                  <Pressable
                    style={[
                      styles.navItem,
                      { backgroundColor: item.color },
                      isWeb && { pointerEvents: "auto" },
                    ]}
                    onPress={async () => {
                      playPopSound();

                      if (item.label === "Play") {
                        try {
                          const stored =
                            await AsyncStorage.getItem("kido.userId");
                          if (stored) {
                            const token = await getCurrentAuthToken();
                            if (token) {
                              router.push("/play");
                            } else {
                              setLoginVisible(true);
                            }
                            return;
                          }
                        } catch {
                          // ignore storage errors and fall through to show register
                        }

                        setRegisterVisible(true);
                        return;
                      }

                      router.push("/");
                    }}
                  >
                    <AppText style={styles.navItemText}>{item.label}</AppText>
                  </Pressable>
                </Animated.View>
              </Animated.View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

function AccountRow({
  label,
  value,
  darkMode = false,
}: {
  label: string;
  value: string;
  darkMode?: boolean;
}) {
  return (
    <View style={[styles.accountRow, darkMode && styles.darkAccountRow]}>
      <AppText style={[styles.accountLabel, darkMode && styles.darkAccountLabel]}>{label}</AppText>
      <AppText style={[styles.accountValue, darkMode && styles.darkAccountText]}>{value}</AppText>
    </View>
  );
}

function LeaderboardAnimation() {
  if (Platform.OS === "web") {
    return (
      <DotLottieReact
        data={require("../assets/leaderboard.json")}
        autoplay
        loop
        style={styles.crownIcon}
      />
    );
  }

  return (
    <LottieView
      source={require("../assets/leaderboard.json")}
      style={styles.crownIcon}
      autoPlay
      loop
    />
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  sunWrap: {
    position: "absolute",
    top: 100,
    left: "50%",
    width: 110,
    height: 110,
    marginLeft: -55,
    alignItems: "center",
    justifyContent: "center",
  },
  sunAnimation: {
    width: 180,
    height: 180,
  },
  moonWrap: {
    position: "absolute",
    top: 20,
    right: 67,
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  moonImage: {
    width: 74,
    height: 74,
  },
  parrotWrap: {
    position: "absolute",
    right: 26,
    top: 150,
    width: 120,
    height: 120,
    zIndex: 2,
    overflow: "visible",
  },
  parrotAnimation: {
    width: 120,
    height: 120,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 30,
  },
  headerArea: {
    alignItems: "flex-start",
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  profileCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  xpWrap: {
    marginLeft: 90,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: "rgba(255, 244, 208, 0.92)",
    borderColor: "#f4b942",
    borderWidth: 3,
    borderRadius: 22,
    shadowColor: "#5b3218",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
  },
  webXpWrap: {
    marginLeft: 140,
  },
  xpIcon: {
    width: 28,
    height: 28,
    backgroundColor: "transparent",
  },
  jewelIconWrap: {
    width: 28,
    height: 28,
    overflow: "hidden",
    borderRadius: 8,
  },
  xpJewelWrap: {
    marginRight: -10,
  },
  iconShine: {
    position: "absolute",
    top: -5,
    left: 0,
    width: 8,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 8,
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 0,
  },
  xpText: {
    color: "#503617",
    fontWeight: "800",
    fontSize: 13,
  },
  darkXpWrap: {
    backgroundColor: "rgba(114, 114, 114, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(21, 173, 211, 0.82)",
  },
  darkXpText: {
    color: "#ffffff",
  },

  addLifeButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#32d279",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 3,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },
  addLifeText: {
    fontFamily: "FredokaBold",
    fontSize: 14,
    color: "#ffffff",
    lineHeight: 14,
    textAlign: "center",
    includeFontPadding: false,
  },
  profileActionCards: {
    position: "relative",
    width: 145,
    flexDirection: "column",
    gap: 8,
    marginTop: 74,
    zIndex: 20,
  },
  webProfileActionCards: {
    marginTop: 140,
    zIndex: 20,
  },
  profileActionCard: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(114, 114, 114, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(21, 173, 211, 0.82)",
    
  },
  dayProfileActionCard: {
    backgroundColor: "rgba(255, 244, 208, 0.92)",
    borderColor: "#f4b942",
    borderWidth: 3,
    borderRadius: 22,
  },
  profileActionIcon: {
    width: 30,
    height: 30,
    marginRight: 5,
  },
  profileActionText: {
    flex: 1,
  },
  profileActionLabel: {
    fontFamily: "FredokaBold",
    fontSize: 11,
    color: "#ffffff",
    lineHeight: 13,
  },
  dayProfileActionText: {
    color: "#503617",
  },
  profileActionSubtitle: {
    fontFamily: "FredokaRegular",
    fontSize: 9,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 11,
  },
  dayProfileActionSubtitle: {
    color: "#6b4a28",
  },
  dailyBadge: {
    width: 47,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    overflow: "visible",
    zIndex: 1,
  },
  iconStack: {
    alignItems: "center",
    justifyContent: "center",
    width: 47,
    height: 46,
    position: "relative",
    zIndex: 1,
  },
  settingsShell: {
    width: 47,
    height: 46,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    marginLeft: "auto",
    marginRight: "auto",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  settingsWrap: {
    width: 47,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 244, 208, 0.92)",
    borderWidth: 3,
    borderColor: "#f4b942",
  },
  darkSettingsWrap: {
    backgroundColor: "rgba(114, 114, 114, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(21, 173, 211, 0.82)",
  
  },
  crownShell: {
    width: 47,
    height: 46,
    position: "absolute",
    top: 144,
    left: 0,
    right: 0,
    marginLeft: "auto",
    marginRight: "auto",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  webBadgeShell: {
    width: 145,
    height: 52,
    left: "auto",
    right: 0,
    marginLeft: 0,
    marginRight: 0,
  },
  starShell: {
    width: 47,
    height: 46,
    position: "absolute",
    top: 72,
    left: 0,
    right: 0,
    marginLeft: "auto",
    marginRight: "auto",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  coinWrap: {
    width: 47,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(114, 114, 114, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(21, 173, 211, 0.82)",
    borderBottomColor: "transparent",
  },
  dayBadgeWrap: {
    backgroundColor: "rgba(255, 244, 208, 0.92)",
    borderWidth: 3,
    borderColor: "#f4b942",
    borderBottomColor: "#f4b942",
  },
  counterBadge: {
    marginTop: -4,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: "rgba(129, 129, 129, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(21, 173, 211, 0.82)",
    alignSelf: "center",
    height: 16,
  },
  counterText: {
    fontFamily: "FredokaBold",
    fontSize: 10,
    color: "#ffffff",
    lineHeight: 10,
    textAlign: "center",
    includeFontPadding: false,
  },
  dayCounterBadge: {
    backgroundColor: "rgba(255, 244, 208, 0.92)",
    borderColor: "#f4b942",
  },
  dayCounterText: {
    color: "#503617",
  },
  dailyBadgeIcon: {
    width: 28,
    height: 28,
  },
  crownWrap: {
    width: 47,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(114, 114, 114, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(21, 173, 211, 0.82)",
    borderBottomColor: "transparent",
  },
  webBadgeWrap: {
    width: 145,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(114, 114, 114, 0.34)",
  },
  rankBadge: {
    marginTop: -4,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: "rgba(129, 129, 129, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(21, 173, 211, 0.82)",
    alignSelf: "center",
    height: 16,
  },
  rankText: {
    fontFamily: "FredokaBold",
    fontSize: 10,
    color: "#ffffff",
    lineHeight: 10,
    textAlign: "center",
    includeFontPadding: false,
  },
  dayRankBadge: {
    backgroundColor: "rgba(255, 244, 208, 0.92)",
    borderColor: "#f4b942",
  },
  crownIcon: {
    width: 40,
    height: 40,
    opacity: 0.95,
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 96,
  },
  navigationGrid: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  navItem: {
    width: 160,
    height: 52,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  playPlayerImage: {
    width: 185,
    height: playerSpriteFrameHeight,
    marginLeft: -20,
    marginBottom: -29,
  },
  playerSpriteViewport: {
    width: playerSpriteFrameWidth,
    height: playerSpriteFrameHeight,
    overflow: "hidden",
    flexShrink: 0,
  },
  playerSpriteImage: {
    position: "absolute",
    left: 0,
    top: 0,
    width: playerSpriteFrameWidth * playerSpriteColumns,
    height: playerSpriteFrameHeight * playerSpriteRows,
  },
  navItemText: {
    fontFamily: "FredokaBold",
    fontSize: 14,
    color: "#ffffff",
    textAlign: "center",
  },
  accountModalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(35, 22, 12, 0.58)",
  },
  accountCard: {
    width: "100%",
    maxWidth: 390,
    padding: 22,
    borderRadius: 24,
    backgroundColor: "#fff4d0",
    borderWidth: 3,
    borderColor: "#f4b942",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  accountCardScrollable: {
    maxHeight: "90%",
  },
  darkAccountCard: {
    backgroundColor: "#242c35",
    borderColor: "#15add3",
  },
  accountTitle: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 24,
    marginBottom: 16,
  },
  darkAccountText: {
    color: "#ffffff",
  },
  accountLabel: {
    color: "#6b4a28",
    fontFamily: "FredokaBold",
    fontSize: 12,
  },
  darkAccountLabel: {
    color: "#b8dce8",
  },
  rewardsCard: {
    width: "100%",
    maxWidth: 390,
    maxHeight: "78%",
    padding: 22,
    borderRadius: 24,
    backgroundColor: "#fff4d0",
    borderWidth: 3,
    borderColor: "#f4b942",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  rewardsSummary: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderRadius: 14, backgroundColor: "rgba(244,185,66,0.22)", marginBottom: 12 },
  rewardsSummaryItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  rewardsIconWrap: { width: 28, height: 28, overflow: "hidden", borderRadius: 8 },
  rewardsIcon: { width: 28, height: 28, backgroundColor: "transparent" },
  rewardsSummaryText: { color: "#503617", fontFamily: "FredokaBold", fontSize: 15 },
  rewardsList: { flexGrow: 0, marginBottom: 12 },
  genreRewardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(107,74,40,0.18)" },
  darkGenreRewardRow: { borderBottomColor: "rgba(184,220,232,0.24)" },
  genreRewardName: { flex: 1, color: "#503617", fontFamily: "FredokaBold", fontSize: 14 },
  genreRewardValues: { flexDirection: "row", alignItems: "center", gap: 4 },
  genreRewardIcon: { width: 16, height: 16 },
  genreRewardValue: { color: "#6b4a28", fontFamily: "FredokaMedium", fontSize: 12 },
  genreRewardEmpty: { color: "#6b4a28", fontFamily: "FredokaRegular", fontSize: 13, textAlign: "center", paddingVertical: 18 },
  rewardsCloseButton: { minHeight: 44, marginTop: 4 },
  accountInput: {
    height: 42,
    marginTop: 5,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d6a338",
    color: "#503617",
    fontFamily: "FredokaRegular",
    fontSize: 15,
    backgroundColor: "#fffaf0",
  },
  darkAccountInput: {
    color: "#ffffff",
    borderColor: "#15add3",
    backgroundColor: "#172029",
  },
  accountSelect: {
    minHeight: 42,
    marginTop: 5,
    marginBottom: 4,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d6a338",
    backgroundColor: "#fffaf0",
  },
  schoolAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  schoolAccountSelect: {
    flex: 1,
  },
  schoolClearButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d6a338",
    backgroundColor: "#fffaf0",
  },
  schoolPickerCard: {
    maxHeight: "90%",
  },
  schoolPickerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  schoolPickerTitle: {
    flex: 1,
    marginBottom: 10,
    paddingRight: 12,
  },
  schoolPickerClose: {
    width: 34,
    height: 34,
    marginTop: -5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#d6a338",
    backgroundColor: "#fffaf0",
  },
  schoolPromptDismiss: {
    alignSelf: "stretch",
    marginTop: 10,
  },
  schoolPromptSaving: {
    marginTop: 6,
    color: "#6b4a28",
    fontFamily: "FredokaRegular",
    fontSize: 13,
  },
  accountSelectText: {
    color: "#503617",
    fontFamily: "FredokaRegular",
    fontSize: 15,
  },
  accountPlaceholder: {
    color: "#9a7a4a",
    fontFamily: "FredokaRegular",
    fontSize: 15,
  },
  dateDoneButton: {
    alignSelf: "flex-end",
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f4b942",
  },
  dateDoneText: {
    color: "#503617",
    fontFamily: "FredokaBold",
  },
  accountGradeMenu: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d6a338",
    backgroundColor: "#fffaf0",
    overflow: "hidden",
  },
  accountGradeOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(214, 163, 56, 0.35)",
  },
  darkAccountOption: {
    borderBottomColor: "rgba(21, 173, 211, 0.35)",
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(107, 74, 40, 0.16)",
  },
  darkAccountRow: {
    borderTopColor: "rgba(184, 220, 232, 0.2)",
  },
  accountValue: {
    flex: 1,
    color: "#503617",
    fontFamily: "FredokaRegular",
    fontSize: 14,
    textAlign: "right",
  },
  passwordEnabledText: {
    marginTop: 5,
    marginBottom: 12,
  },
  addPasswordButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  accountError: {
    marginTop: 8,
    color: "#b42318",
    fontFamily: "FredokaRegular",
    fontSize: 13,
  },
  accountActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  accountLogout: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d96b61",
    backgroundColor: "#fff0ed",
  },
  darkAccountLogout: {
    backgroundColor: "#332426",
    borderColor: "#e57a70",
  },
  accountLogoutText: {
    color: "#b42318",
    fontFamily: "FredokaBold",
  },
  accountCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  accountCancelText: {
    color: "#6b4a28",
    fontFamily: "FredokaBold",
  },
  darkAccountCancel: {
    backgroundColor: "transparent",
  },
  accountSave: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f4b942",
  },
  accountSaveText: {
    color: "#503617",
    fontFamily: "FredokaBold",
  },
  darkAccountSave: {
    backgroundColor: "#15add3",
  },
});
