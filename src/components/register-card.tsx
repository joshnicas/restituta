import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAudioPlayer } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import api, { getAuthToken } from "../lib/api";
import { useAudioPreferences } from "../lib/audio-preferences";
import AppText from "./app-text";
import AppTextInput from "./app-text-input";

const popSound = require("../assets/sound.effects/pop.mp3");
const initialGameProfile = {
  xp: 2,
  coins: 2,
  stars: 2,
  currentStreak: 0,
  longestStreak: 0,
  key: "0",
};

const getRegisteredUserId = (
  response: unknown,
): string | number | undefined => {
  if (!response || typeof response !== "object") {
    return undefined;
  }

  const payload = response as Record<string, unknown>;
  const data = payload.data as Record<string, unknown> | undefined;
  const user = payload.user as Record<string, unknown> | undefined;
  const dataUser = data?.user as Record<string, unknown> | undefined;
  const candidates = [payload, user, data, dataUser];

  for (const candidate of candidates) {
    const id = candidate?.id ?? candidate?.userId;
    if (typeof id === "string" || typeof id === "number") {
      return id;
    }
  }

  return undefined;
};

type RegisterCardProps = {
  visible: boolean;
  gradeOnly?: boolean;
  onClose: () => void;
  onLoginPress?: () => void;
  onSubmit?: (values: {
    username: string;
    email?: string;
    dob: string;
    gradeId?: number;
    gradeName?: string;
  }) => void;
};

export default function RegisterCard({
  visible,
  gradeOnly = false,
  onClose,
  onLoginPress,
  onSubmit,
}: RegisterCardProps) {
  const slideY = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const popPlayer = useAudioPlayer(popSound);
  const { soundEnabled, preferencesLoaded } = useAudioPreferences();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameExists, setUsernameExists] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const usernameDebounceRef = useRef<number | null>(null);
  const lastCheckRef = useRef(0);
  const [dob, setDob] = useState("");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [grades, setGrades] = useState<Array<{ id: number; name: string }>>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);
  const [gradeId, setGradeId] = useState<number | null>(null);
  const [gradeName, setGradeName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState("");

  const playPopSound = () => {
    if (!preferencesLoaded || !soundEnabled) return;
    try {
      popPlayer.seekTo(0);
      popPlayer.play();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (preferencesLoaded && soundEnabled) return;
    try {
      popPlayer.pause();
    } catch {
      // Ignore transient audio playback issues while preferences load or change.
    }
  }, [popPlayer, preferencesLoaded, soundEnabled]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(slideY, {
          toValue: 0,
          friction: 7,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: 300,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, slideY]);

  useEffect(() => {
    let mounted = true;
    const loadGrades = async () => {
      setGradesLoading(true);
      try {
        const data = await api.getGrades();
        // handle responses that are either an array or an object with `grades`
        const list = Array.isArray(data) ? data : data?.grades || [];
        if (mounted) setGrades(list);
      } catch (e) {
        // ignore - keep empty list
        console.warn("Failed to load grades", e);
      } finally {
        if (mounted) setGradesLoading(false);
      }
    };

    if (visible) loadGrades();
    // generate a default player id when opened if empty
    if (visible && !username) {
      const id = generatePlayerId();
      setUsername(id);
      // kick off availability check
      checkUsernameAvailability(id);
    }
    return () => {
      mounted = false;
    };
  }, [visible]);

  useEffect(() => {
    return () => {
      if (usernameDebounceRef.current) {
        clearTimeout(usernameDebounceRef.current as any);
      }
    };
  }, []);

  function generatePlayerId() {
    const n = Math.floor(Math.random() * 10000);
    const s = String(n).padStart(4, "0");
    return `player${s}`;
  }

  const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  };

  const selectedDate = dob ? new Date(`${dob}T12:00:00`) : new Date(2015, 0, 1);

  // New DateTimePicker API: use onValueChange/onDismiss instead of onChange

  async function checkUsernameAvailability(name: string) {
    const checkId = ++lastCheckRef.current;
    if (!name) {
      setUsernameExists(false);
      setUsernameError("");
      return;
    }

    setUsernameChecking(true);
    setUsernameError("");
    try {
      const users: any = await api.getUsers();
      // normalize list
      const list = Array.isArray(users)
        ? users
        : users?.users || users?.data || [];
      const exists = list.some((u: any) => {
        if (!u) return false;
        return (
          (u.userID && u.userID.toLowerCase() === name.toLowerCase()) ||
          (u.userId && u.userId.toLowerCase() === name.toLowerCase()) ||
          (u.username && u.username.toLowerCase() === name.toLowerCase())
        );
      });

      // only set if this is the latest check
      if (checkId === lastCheckRef.current) {
        setUsernameExists(!!exists);
        setUsernameError(exists ? "User already exists" : "");
      }
    } catch (err) {
      // couldn't check; be permissive
      if (checkId === lastCheckRef.current) {
        setUsernameExists(false);
        setUsernameError("");
      }
      console.warn("username check failed", err);
    } finally {
      if (checkId === lastCheckRef.current) setUsernameChecking(false);
    }
  }

  const getRegistrationErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
      return error.message;
    }

    return "Could not save your registration. Please try again.";
  };

  const saveRegistration = async (
    skipDetails: boolean,
    selectedGrade?: { id: number; name: string },
  ) => {
    const userID = username.trim();
    const registrationGradeId = selectedGrade?.id ?? gradeId;
    const registrationGradeName = selectedGrade?.name ?? gradeName;
    if (!userID || usernameChecking || usernameExists || submitting) {
      return;
    }

    if (gradeOnly && registrationGradeId === null) {
      return;
    }

    if (!gradeOnly && !skipDetails && (!email.trim() || !dob || gradeId === null)) {
      setRegistrationError(
        "Enter your email, date of birth, and grade to save.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setRegistrationError("");

      const registrationResponse = await api.postAuthRegister(
        gradeOnly
          ? { userID, gradeId: registrationGradeId }
          : skipDetails
          ? { userID }
          : {
              userID,
              email: email.trim(),
              DoB: `${dob}T00:00:00.000Z`,
              gradeId,
            },
      );

      let registeredUserId = getRegisteredUserId(registrationResponse);
      if (registeredUserId === undefined) {
        throw new Error(
          "User was registered, but the response did not include an ID for the game profile.",
        );
      }
      // If registration response didn't return a numeric DB id (e.g. returned username),
      // try to resolve the numeric id by fetching users and matching by userID.
      try {
        if (typeof registeredUserId !== "number") {
          const usersAny: any = await api.getUsers();
          const usersList = Array.isArray(usersAny)
            ? usersAny
            : usersAny?.users || usersAny?.data || [];

          const match = usersList.find((u: any) => {
            if (!u) return false;
            const uid = (
              u.userID ||
              u.userId ||
              u.username ||
              u.id ||
              ""
            ).toString();
            // prefer matching the username we just registered
            if (uid === username) return true;
            // also match if returned id matches registeredUserId string
            if (registeredUserId && uid === String(registeredUserId))
              return true;
            return false;
          });

          if (match && (match.id !== undefined || match.userId !== undefined)) {
            // prefer numeric `id` field
            registeredUserId = match.id ?? match.userId ?? registeredUserId;
          }
        }
      } catch (e) {
        // ignore lookup errors; we'll attempt to coerce below
      }

      // If the backend expects a numeric userId, coerce numeric strings to numbers
      const userIdForProfile: string | number =
        typeof registeredUserId === "string" &&
        /^[0-9]+$/.test(registeredUserId)
          ? Number(registeredUserId)
          : registeredUserId;

      // Login first so we can query `/users/me` (cookie/session or token) to
      // obtain the numeric DB id that the profiles endpoint expects.
      const loginResponse = await api.postAuthLogin({ userID });

      // Extract and store auth token for future authenticated requests
      const authToken = getAuthToken(loginResponse);
      if (authToken) {
        try {
          await AsyncStorage.setItem("kido.authToken", String(authToken));
        } catch {
          // ignore storage errors
        }
      }

      // Try to resolve numeric id via /users/me (requires auth token)
      let resolvedId: string | number | undefined = undefined;
      try {
        const me: any = await api.getUserMe(authToken || "");
        if (me && (me.id !== undefined || me.userId !== undefined)) {
          resolvedId = me.id ?? me.userId;
        }
      } catch {
        // ignore
      }

      // fall back to previously resolved registeredUserId if /users/me didn't yield an id
      const finalRegisteredId = resolvedId ?? registeredUserId;

      const finalUserIdForProfile: string | number =
        typeof finalRegisteredId === "string" &&
        /^[0-9]+$/.test(finalRegisteredId)
          ? Number(finalRegisteredId)
          : finalRegisteredId;

      try {
        await api.postUserGameProfile({
          userId: finalUserIdForProfile,
          ...initialGameProfile,
        });
      } catch (err) {
        // ignore unique constraint (profile already exists) from backend (Prisma P2002 or similar)
        const msg = (err as any)?.message || String(err);
        if (/Unique constraint failed|P2002/i.test(msg)) {
          // profile exists already — not fatal for registration UI
        } else {
          throw err;
        }
      }

      // persist a lightweight logged-in indicator for UI checks
      try {
        await AsyncStorage.setItem("kido.userId", String(userID));
        // Also store numeric userId if we resolved it
        if (typeof finalUserIdForProfile === "number") {
          await AsyncStorage.setItem("kido.numericUserId", String(finalUserIdForProfile));
        }
      } catch {
        // ignore storage errors
      }

      playPopSound();
      onSubmit?.({
        username: userID,
        email: skipDetails || gradeOnly ? undefined : email.trim(),
        dob: skipDetails || gradeOnly ? "" : dob,
        gradeId: skipDetails && !gradeOnly ? undefined : (registrationGradeId ?? undefined),
        gradeName: skipDetails && !gradeOnly ? undefined : registrationGradeName,
      });
      onClose();
    } catch (error) {
      setRegistrationError(getRegistrationErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.overlay, { opacity }]}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <Animated.View
        style={[
          styles.card,
          gradeOnly && styles.gradeOnlyCard,
          { transform: [{ translateY: slideY }] },
        ]}
      >
        {gradeOnly ? (
          <>
            <View style={styles.headerRow}>
              <AppText style={[styles.title, styles.gradeOnlyTitle]}>
                Select your grade to proceed
              </AppText>
              <Pressable
                style={[styles.closeButton, styles.gradeOnlyCloseButton]}
                onPress={() => {
                  playPopSound();
                  onClose();
                }}
                accessibilityLabel="Close registration dialog"
              >
                <AppText style={styles.closeText}>×</AppText>
              </Pressable>
            </View>

            <Pressable
              style={[styles.input, styles.selectBox]}
              onPress={() => setGradeOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Select your grade"
            >
              <AppText
                style={[
                  styles.gradeOnlySelectText,
                  gradeName ? styles.gradeOnlySelectedText : styles.gradeOnlyPlaceholderText,
                ]}
              >
                {gradeName || (gradesLoading ? "Loading..." : "Select grade")}
              </AppText>
            </Pressable>

            {gradeOpen && (
              <ScrollView style={styles.dropdown} contentContainerStyle={styles.dropdownContent}>
                {grades.map((grade) => (
                  <Pressable
                    key={grade.id}
                    style={styles.dropdownItem}
                    disabled={submitting || usernameChecking || usernameExists}
                    onPress={() => {
                      const selected = { id: Number(grade.id), name: grade.name };
                      setGradeId(selected.id);
                      setGradeName(selected.name);
                      setGradeOpen(false);
                      void saveRegistration(false, selected);
                    }}
                  >
                    <AppText style={[styles.dropdownText, styles.gradeOnlyOptionText]}>
                      {grade.name}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {usernameChecking ? <AppText style={styles.gradeOnlyInfo}>Preparing your player ID...</AppText> : null}
            {usernameError ? <AppText style={styles.gradeOnlyError}>{usernameError}</AppText> : null}
            {submitting ? <AppText style={styles.gradeOnlyInfo}>Registering...</AppText> : null}
            {registrationError ? <AppText style={styles.gradeOnlyError}>{registrationError}</AppText> : null}
            {onLoginPress ? (
              <Pressable style={styles.loginLink} onPress={onLoginPress} accessibilityRole="button">
                <AppText style={styles.loginLinkText}>Already have an account? Log in</AppText>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
        <View style={styles.headerRow}>
          <View>
            <AppText style={styles.title}>Register</AppText>
            <AppText style={styles.subtitle}>
              Fill in your details to create your profile
            </AppText>
          </View>

          <Pressable
            style={styles.closeButton}
            onPress={() => {
              playPopSound();
              onClose();
            }}
            accessibilityLabel="Close register dialog"
          >
            <AppText style={styles.closeText}>×</AppText>
          </Pressable>
        </View>

        <View style={styles.singleField}>
          <AppText style={styles.optionLabel}>Username</AppText>
          <View style={styles.usernameRow}>
            <AppTextInput
              value={username}
              onChangeText={(v) => {
                setUsername(v);
                setUsernameExists(false);
                setUsernameError("");
                // debounce availability check
                if (usernameDebounceRef.current) {
                  clearTimeout(usernameDebounceRef.current as any);
                }
                usernameDebounceRef.current = setTimeout(() => {
                  checkUsernameAvailability(v);
                }, 450) as unknown as number;
              }}
              placeholder="Player name"
              placeholderTextColor="#8b6a3a"
              style={[
                styles.input,
                styles.usernameInput,
                usernameExists ? styles.inputError : null,
              ]}
              accessibilityLabel="Username"
            />

            <Pressable
              style={styles.regenButton}
              onPress={() => {
                const id = generatePlayerId();
                setUsername(id);
                setUsernameExists(false);
                setUsernameError("");
                // clear any pending debounce
                if (usernameDebounceRef.current) {
                  clearTimeout(usernameDebounceRef.current as any);
                }
                checkUsernameAvailability(id);
                try {
                  popPlayer.seekTo(0);
                  popPlayer.play();
                } catch {}
              }}
              accessibilityLabel="Regenerate user id"
            >
              <AppText style={styles.regenText}>⟳</AppText>
            </Pressable>
          </View>

          {usernameError ? (
            <AppText style={styles.errorText}>{usernameError}</AppText>
          ) : null}
        </View>
        <View style={styles.singleField}>
          <AppText style={styles.optionLabel}>Email</AppText>
          <AppTextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#8b6a3a"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Email"
          />
        </View>
        <View style={styles.fieldRow}>
          <View style={styles.fieldColumn}>
            <AppText style={styles.optionLabel}>Date of birth</AppText>
            <Pressable
              style={[styles.input, styles.selectBox]}
              onPress={() => setDatePickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Select date of birth"
            >
              <AppText style={{ color: dob ? "#4a2d12" : "#8b6a3a" }}>
                {dob || "Select date"}
              </AppText>
            </Pressable>
            {datePickerVisible && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                // Support multiple incoming shapes: Date, timestamp number,
                // or event-based (onChange signature) to robustly set `dob`.
                onValueChange={(val?: Date | number | any) => {
                  try {
                    if (Platform.OS === "android") {
                      setDatePickerVisible(false);
                    }

                    if (!val) return;

                    let date: Date | null = null;
                    if (val instanceof Date) date = val;
                    else if (typeof val === "number") date = new Date(val);
                    else if (val && typeof val === "object") {
                      // some platforms pass an event-like object
                      const ts =
                        (val as any).nativeEvent?.timestamp ??
                        (val as any).timestamp;
                      if (ts) date = new Date(ts);
                    }

                    if (date) setDob(formatDate(date));
                  } catch (e) {
                    // ignore parse errors
                  }
                }}
                onChange={(
                  _event: any,
                  selected?: Date | number | undefined,
                ) => {
                  // keep backward-compatible behavior for platforms that still emit onChange
                  if (Platform.OS === "android") {
                    setDatePickerVisible(false);
                  }
                  if (!selected) return;
                  const date =
                    selected instanceof Date
                      ? selected
                      : new Date(selected as any);
                  setDob(formatDate(date));
                }}
                onDismiss={() => setDatePickerVisible(false)}
              />
            )}
            {datePickerVisible && Platform.OS === "ios" && (
              <Pressable
                style={styles.dateDoneButton}
                onPress={() => setDatePickerVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Done selecting date of birth"
              >
                <AppText style={styles.dateDoneText}>Done</AppText>
              </Pressable>
            )}
          </View>

          <View style={styles.fieldColumn}>
            <AppText style={styles.optionLabel}>Grade</AppText>
            <Pressable
              style={[styles.input, styles.selectBox]}
              onPress={() => setGradeOpen((v) => !v)}
            >
              <AppText style={{ color: gradeName ? "#4a2d12" : "#8b6a3a" }}>
                {gradeName || (gradesLoading ? "Loading..." : "Select grade")}
              </AppText>
            </Pressable>

            {gradeOpen && (
              <ScrollView
                style={styles.dropdown}
                contentContainerStyle={styles.dropdownContent}
              >
                {grades.map((g) => {
                  const selected = gradeId === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      style={[
                        styles.dropdownItem,
                        selected && styles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        setGradeId(Number(g.id));
                        setGradeName(g.name);
                        setGradeOpen(false);
                      }}
                    >
                      <AppText
                        style={
                          selected
                            ? styles.dropdownTextSelected
                            : styles.dropdownText
                        }
                      >
                        {g.name}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>

        <View style={styles.footerRow}>
          <Pressable
            style={[
              styles.secondaryButton,
              (usernameChecking || submitting) && styles.primaryButtonDisabled,
            ]}
            onPress={() => void saveRegistration(true)}
            disabled={
              !username.trim() ||
              usernameChecking ||
              usernameExists ||
              submitting
            }
            accessibilityLabel="Skip registration details and save user ID"
          >
            <AppText style={styles.secondaryText}>
              {submitting ? "Saving..." : "Skip"}
            </AppText>
          </Pressable>

          <Pressable
            style={[
              styles.primaryButton,
              (usernameExists ||
                usernameChecking ||
                !username.trim() ||
                !email.trim() ||
                !dob ||
                gradeId === null ||
                submitting) &&
                styles.primaryButtonDisabled,
            ]}
            onPress={() => void saveRegistration(false)}
            accessibilityLabel="Save registration"
            disabled={
              usernameExists ||
              usernameChecking ||
              !username.trim() ||
              !email.trim() ||
              !dob ||
              gradeId === null ||
              submitting
            }
          >
            <AppText style={styles.primaryText}>
              {submitting ? "Saving..." : "Save"}
            </AppText>
          </Pressable>
        </View>
        {registrationError ? (
          <AppText style={styles.errorText}>{registrationError}</AppText>
        ) : null}
        {onLoginPress ? (
          <Pressable style={styles.loginLink} onPress={onLoginPress} accessibilityRole="button">
            <AppText style={styles.loginLinkText}>Already have an account? Log in</AppText>
          </Pressable>
        ) : null}
          </>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.38)",
  },
  card: {
    position: "relative",
    width: "84%",
    maxWidth: 360,
    backgroundColor: "#fff8ed",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    zIndex: 1,
  },
  gradeOnlyCard: {
    maxWidth: 390,
    padding: 22,
    backgroundColor: "#fff4d0",
    borderWidth: 3,
    borderColor: "#f4b942",
    shadowOpacity: 0.25,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    marginBottom: 14,
    paddingRight: 56,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#3a2c1f",
  },
  gradeOnlyTitle: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 22,
    fontWeight: "normal",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(58,44,31,0.8)",
    fontWeight: "600",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3d7aa",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 24, lineHeight: 24, color: "#4a2d12" },
  gradeOnlyCloseButton: {
    backgroundColor: "#f4b942",
  },
  gradeOnlySelectText: {
    fontFamily: "FredokaMedium",
    fontSize: 16,
  },
  gradeOnlySelectedText: {
    color: "#503617",
  },
  gradeOnlyPlaceholderText: {
    color: "#8b6a3a",
  },
  gradeOnlyOptionText: {
    fontFamily: "FredokaMedium",
    fontSize: 15,
  },
  gradeOnlyInfo: {
    marginTop: 8,
    color: "#6b4a28",
    fontFamily: "FredokaRegular",
    fontSize: 13,
  },
  gradeOnlyError: {
    marginTop: 8,
    color: "#b83232",
    fontFamily: "FredokaMedium",
    fontSize: 13,
  },
  loginLink: {
    alignSelf: "center",
    paddingVertical: 10,
  },
  loginLinkText: {
    color: "#186b82",
    fontFamily: "FredokaMedium",
    fontSize: 14,
    textAlign: "center",
  },
  singleField: {
    width: "100%",
    marginBottom: 10,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  fieldColumn: {
    flex: 1,
    marginTop: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: "#4a2d12",
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(122,82,36,0.12)",
    backgroundColor: "rgba(255,255,255,0.9)",
    fontSize: 14,
    color: "#4a2d12",
  },
  inputError: {
    borderColor: "#e24b4b",
    backgroundColor: "#fff6f6",
  },
  dateDoneButton: {
    alignSelf: "flex-end",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateDoneText: {
    color: "#4a2d12",
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    marginTop: 6,
    color: "#e24b4b",
    fontSize: 12,
    fontWeight: "700",
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  usernameInput: {
    flex: 1,
    marginRight: 8,
  },
  regenButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(122,82,36,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  regenText: {
    fontSize: 18,
    color: "#4a2d12",
    fontWeight: "700",
  },
  selectBox: {
    justifyContent: "center",
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(122,82,36,0.08)",
    maxHeight: 220,
    paddingVertical: 8,
  },
  dropdownContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    gap: 8,
  },
  dropdownItem: {
    width: "100%",
    margin: "1%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#fff8f0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  dropdownItemSelected: {
    backgroundColor: "#f9a94b",
  },
  dropdownText: {
    color: "#4a2d12",
    fontWeight: "600",
  },
  dropdownTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  footerRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "transparent",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(122,82,36,0.12)",
    alignItems: "center",
  },
  secondaryText: { color: "#4a2d12", fontWeight: "700" },
  primaryButton: {
    flex: 1,
    backgroundColor: "#f9a94b",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryText: { color: "#fff", fontWeight: "800" },
});
