import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { addUserPassword, getAuthToken, getGrades, getUsers, postAuthLogin, postAuthRegister } from "../lib/api";
import { normalizeTanzanianPhoneNumber } from "../lib/phone-number";
import AppText from "./app-text";
import AppTextInput from "./app-text-input";

const hidePasswordImage = require("../assets/password-image/hide.png");
const seePasswordImage = require("../assets/password-image/see.png");

type LoginCardProps = {
  visible: boolean;
  darkMode?: boolean;
  onClose: () => void;
  onSuccess: (selectedPlayer: 1 | 2) => void;
};

export default function LoginCard({
  visible,
  darkMode = false,
  onClose,
  onSuccess,
}: LoginCardProps) {
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [grades, setGrades] = useState<Array<{ id: number; name: string }>>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesError, setGradesError] = useState("");
  const [gradeOpen, setGradeOpen] = useState(false);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedGradeName, setSelectedGradeName] = useState("");
  const [generatingId, setGeneratingId] = useState(false);
  const [checkingId, setCheckingId] = useState(false);
  const [userIdExists, setUserIdExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [emailCheckError, setEmailCheckError] = useState("");
  const userIdCheckRef = useRef(0);
  const emailCheckRef = useRef(0);
  const phoneCheckRef = useRef(0);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const getAllUsers = async () => {
    const firstPage: any = await getUsers({ page: 1, limit: 100 });
    const firstUsers = Array.isArray(firstPage)
      ? firstPage
      : firstPage?.users ?? firstPage?.data?.users ?? firstPage?.data ?? [];
    if (!Array.isArray(firstUsers)) throw new Error("Could not read user records.");
    const totalPages = Math.max(1, Number(firstPage?.totalPages ?? firstPage?.data?.totalPages ?? 1));
    const allUsers = [...firstUsers];
    for (let page = 2; page <= totalPages; page += 1) {
      const response: any = await getUsers({ page, limit: 100 });
      const users = Array.isArray(response)
        ? response
        : response?.users ?? response?.data?.users ?? response?.data ?? [];
      if (!Array.isArray(users)) throw new Error("Could not read user records.");
      allUsers.push(...users);
    }
    return allUsers;
  };

  useEffect(() => {
    if (!visible || !isSigningUp) {
      setGradeOpen(false);
      return;
    }

    let active = true;
    setGradesLoading(true);
    setGradesError("");
    void getGrades()
      .then((response: any) => {
        const rows = Array.isArray(response) ? response : response?.grades ?? response?.data?.grades ?? [];
        const availableGrades = Array.isArray(rows)
          ? rows
              .map((grade: any) => ({ id: Number(grade?.id), name: String(grade?.name ?? "") }))
              .filter((grade: { id: number; name: string }) => Number.isInteger(grade.id) && grade.id > 0 && grade.name)
          : [];
        if (active) {
          setGrades(availableGrades);
          if (availableGrades.length === 0) setGradesError("No grades are currently available.");
        }
      })
      .catch(() => {
        if (active) setGradesError("Could not load grades. Check your connection and try again.");
      })
      .finally(() => {
        if (active) setGradesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [visible, isSigningUp]);

  const generateAvailableUserId = async () => {
    if (generatingId) return;
    setGeneratingId(true);
    setError("");
    try {
      const users = await getAllUsers();
      const existingIds = new Set<string>(
        users.flatMap((user: any) => {
          const id = user?.userID ?? user?.userId ?? user?.username;
          return typeof id === "string" ? [id.trim().toLowerCase()] : [];
        }),
      );
      let candidate = "";
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const nextId = `player${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
        if (!existingIds.has(nextId.toLowerCase())) {
          candidate = nextId;
          break;
        }
      }
      if (!candidate) throw new Error("Could not find an available User ID. Please try again.");
      setIdentifier(candidate);
      setUserIdExists(false);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Could not check for an available User ID.");
    } finally {
      setGeneratingId(false);
    }
  };

  useEffect(() => {
    if (!visible || !isSigningUp || !identifier.trim()) {
      setCheckingId(false);
      setUserIdExists(false);
      return;
    }
    const checkId = ++userIdCheckRef.current;
    setCheckingId(true);
    const timeout = setTimeout(async () => {
      try {
        const users = await getAllUsers();
        const candidate = identifier.trim().toLowerCase();
        const exists = users.some((user: any) => {
          const id = user?.userID ?? user?.userId ?? user?.username;
          return typeof id === "string" && id.trim().toLowerCase() === candidate;
        });
        if (checkId === userIdCheckRef.current) setUserIdExists(exists);
      } catch {
        if (checkId === userIdCheckRef.current) {
          setUserIdExists(false);
          setError("Could not check User ID availability. Try again.");
        }
      } finally {
        if (checkId === userIdCheckRef.current) setCheckingId(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [visible, isSigningUp, identifier]);

  useEffect(() => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!visible || !isSigningUp || !normalizedEmail || !validEmail) {
      setCheckingEmail(false);
      setEmailExists(false);
      setEmailCheckError("");
      return;
    }

    const checkId = ++emailCheckRef.current;
    setCheckingEmail(true);
    setEmailExists(false);
    setEmailCheckError("");
    setSelectedGradeId(null);
    setSelectedGradeName("");
    setGradeOpen(false);
    const timeout = setTimeout(async () => {
      try {
        const users = await getAllUsers();
        const exists = users.some((user: any) =>
          typeof user?.email === "string" && user.email.trim().toLowerCase() === normalizedEmail,
        );
        if (checkId === emailCheckRef.current) setEmailExists(exists);
      } catch {
        if (checkId === emailCheckRef.current) {
          setEmailCheckError("Could not verify email availability. Check your connection and try again.");
        }
      } finally {
        if (checkId === emailCheckRef.current) setCheckingEmail(false);
      }
    }, 450);
    return () => clearTimeout(timeout);
  }, [visible, isSigningUp, email, validEmail]);

  useEffect(() => {
    const normalizedPhone = normalizeTanzanianPhoneNumber(phoneNumber);
    if (!visible || !isSigningUp || !normalizedPhone) {
      setCheckingPhone(false);
      setPhoneExists(false);
      return;
    }
    const checkId = ++phoneCheckRef.current;
    setCheckingPhone(true);
    const timeout = setTimeout(async () => {
      try {
        const users = await getAllUsers();
        const exists = users.some((user: any) =>
          typeof user?.phoneNumber === "string" && normalizeTanzanianPhoneNumber(user.phoneNumber) === normalizedPhone,
        );
        if (checkId === phoneCheckRef.current) setPhoneExists(exists);
      } catch {
        if (checkId === phoneCheckRef.current) setPhoneExists(false);
      } finally {
        if (checkId === phoneCheckRef.current) setCheckingPhone(false);
      }
    }, 450);
    return () => clearTimeout(timeout);
  }, [visible, isSigningUp, phoneNumber]);

  const switchMode = (signingUp: boolean) => {
    setIsSigningUp(signingUp);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setEmail("");
    setPhoneNumber("");
    setEmailExists(false);
    setPhoneExists(false);
    setEmailCheckError("");
    if (signingUp) {
      setIdentifier("");
      void generateAvailableUserId();
    }
    else setIdentifier("");
  };

  const submitSignUp = async () => {
    if (saving || checkingId || userIdExists || checkingEmail || emailExists || checkingPhone || phoneExists || gradesLoading || selectedGradeId === null || (email.trim() !== "" && !validEmail) || !identifier.trim() || password.length < 8) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const userID = identifier.trim();
      const currentUsers = await getAllUsers();
      if (currentUsers.some((user: any) => {
        const id = user?.userID ?? user?.userId ?? user?.username;
        return typeof id === "string" && id.trim().toLowerCase() === userID.toLowerCase();
      })) {
        setUserIdExists(true);
        throw new Error("User already exists");
      }
      const registrationResponse = await postAuthRegister({ userID, email: email.trim() || undefined, phoneNumber: phoneNumber.trim() ? normalizeTanzanianPhoneNumber(phoneNumber) : undefined, gradeId: selectedGradeId });
      const registrationUser = registrationResponse?.user ?? registrationResponse?.data?.user ?? registrationResponse?.data ?? registrationResponse;
      // Registration creates the account before it has a password. Use the
      // documented passwordless registration login to establish a session,
      // then set the password through the authenticated endpoint.
      const sessionResponse = getAuthToken(registrationResponse)
        ? registrationResponse
        : await postAuthLogin({ userID });
      const token = getAuthToken(sessionResponse);
      const user = sessionResponse?.user ?? sessionResponse?.data?.user ?? sessionResponse?.data ?? registrationUser;
      if (!token) throw new Error("Account created, but sign in did not return a session.");
      await addUserPassword(password, String(token));
      await AsyncStorage.setItem("kido.userId", String(user?.userID ?? userID));
      if (user?.id !== undefined && Number.isFinite(Number(user.id))) {
        await AsyncStorage.setItem("kido.numericUserId", String(user.id));
      }
      const selectedPlayer: 1 | 2 = user?.selectedPlayer === 1 ? 1 : 2;
      await AsyncStorage.setItem("kido.player", String(selectedPlayer));
      setPassword("");
      onSuccess(selectedPlayer);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create your account. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (saving || !identifier.trim() || !password) return;
    try {
      setSaving(true);
      setError("");
      const response = await postAuthLogin({
        identifier: identifier.trim(),
        password,
      });
      const user = response?.user ?? response?.data?.user ?? response?.data ?? response;
      const token = getAuthToken(response);
      const userID = String(user?.userID ?? "").trim();
      if (!token || !userID) {
        throw new Error("Login succeeded, but the account details were incomplete.");
      }
      await AsyncStorage.setItem("kido.userId", userID);
      if (user?.id !== undefined && Number.isFinite(Number(user.id))) {
        await AsyncStorage.setItem("kido.numericUserId", String(user.id));
      }
      const selectedPlayer: 1 | 2 = user?.selectedPlayer === 1 ? 1 : 2;
      await AsyncStorage.setItem("kido.player", String(selectedPlayer));
      setPassword("");
      onSuccess(selectedPlayer);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not sign in. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close login" />
        <View style={[styles.card, darkMode && styles.darkCard]}>
          <Pressable
            onPress={onClose}
            style={[styles.closeButton, darkMode && styles.darkCloseButton]}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <AppText style={[styles.closeText, darkMode && styles.darkText]}>×</AppText>
          </Pressable>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <AppText style={[styles.title, darkMode && styles.darkText]}>{isSigningUp ? "Sign up" : "Log in"}</AppText>
            <AppText style={[styles.label, darkMode && styles.darkLabel]}>{isSigningUp ? "User ID" : "User ID, email, or phone"}</AppText>
            {isSigningUp ? (
              <View style={styles.userIdRow}>
                <AppTextInput
                  value={identifier}
                  onChangeText={(value) => {
                    setIdentifier(value);
                    setUserIdExists(false);
                    setError("");
                  }}
                  style={[styles.input, styles.userIdInput, darkMode && styles.darkInput]}
                  placeholder="User ID"
                  placeholderTextColor={darkMode ? "#9bb8c2" : "#9a7a4a"}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  autoComplete="username"
                  accessibilityLabel="User ID"
                />
                <Pressable
                  onPress={() => void generateAvailableUserId()}
                  style={[styles.regenerateButton, darkMode && styles.darkRegenerateButton]}
                  accessibilityRole="button"
                  accessibilityLabel="Regenerate user ID"
                  disabled={saving || generatingId}
                >
                  <AppText style={[styles.regenerateText, darkMode && styles.darkText]}>{generatingId ? "…" : "↻"}</AppText>
                </Pressable>
              </View>
            ) : (
              <AppTextInput
                value={identifier}
                onChangeText={setIdentifier}
                style={[styles.input, darkMode && styles.darkInput]}
                placeholder="User ID, email, or phone"
                placeholderTextColor={darkMode ? "#9bb8c2" : "#9a7a4a"}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
                autoComplete="username"
                accessibilityLabel="User ID, email, or phone"
              />
            )}
            {isSigningUp && identifier.trim() && (checkingId || userIdExists) ? (
              <AppText style={userIdExists ? styles.error : [styles.hint, darkMode && styles.darkLabel]}>
                {checkingId ? "Checking User ID..." : "User already exists"}
              </AppText>
            ) : null}
            {isSigningUp ? (
              <>
                <AppText style={[styles.label, darkMode && styles.darkLabel]}>Phone number</AppText>
                <AppTextInput
                  value={phoneNumber}
                  onChangeText={(value) => { setPhoneNumber(value); setError(""); }}
                  style={[styles.input, darkMode && styles.darkInput]}
                  placeholder="Phone number"
                  placeholderTextColor={darkMode ? "#9bb8c2" : "#9a7a4a"}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  accessibilityLabel="Phone number"
                />
                {checkingPhone || phoneExists ? <AppText style={phoneExists ? styles.error : [styles.hint, darkMode && styles.darkLabel]}>{checkingPhone ? "Checking phone number..." : "Phone number already exists"}</AppText> : null}
                <AppText style={[styles.label, darkMode && styles.darkLabel]}>Grade</AppText>
                <Pressable
                  onPress={() => setGradeOpen((open) => !open)}
                  style={[styles.input, styles.gradeSelect, darkMode && styles.darkInput]}
                  accessibilityRole="button"
                  accessibilityLabel="Choose your grade"
                  disabled={gradesLoading || grades.length === 0}
                >
                  <AppText style={[styles.gradeSelectText, !selectedGradeName && styles.gradePlaceholder, darkMode && styles.darkText]}>
                    {selectedGradeName || (gradesLoading ? "Loading grades..." : "Select grade")}
                  </AppText>
                </Pressable>
                {gradeOpen ? (
                  <ScrollView style={[styles.gradeDropdown, darkMode && styles.darkGradeDropdown]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {grades.map((grade) => (
                      <Pressable
                        key={grade.id}
                        onPress={() => {
                          setSelectedGradeId(grade.id);
                          setSelectedGradeName(grade.name);
                          setGradeOpen(false);
                          setError("");
                        }}
                        style={[styles.gradeOption, selectedGradeId === grade.id && styles.selectedGradeOption, darkMode && styles.darkGradeOption, darkMode && selectedGradeId === grade.id && styles.darkSelectedGradeOption]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: selectedGradeId === grade.id }}
                      >
                        <AppText style={[styles.gradeOptionText, darkMode && styles.darkText]}>{grade.name}</AppText>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
                {gradesError ? <AppText style={styles.error}>{gradesError}</AppText> : null}
              </>
            ) : null}
            <AppText style={[styles.label, darkMode && styles.darkLabel]}>Password</AppText>
            <View style={styles.passwordRow}>
              <AppTextInput
                value={password}
                onChangeText={setPassword}
                style={[styles.input, styles.passwordInput, darkMode && styles.darkInput]}
                placeholder="Password"
                placeholderTextColor={darkMode ? "#9bb8c2" : "#9a7a4a"}
                secureTextEntry={!passwordVisible}
                textContentType="password"
                autoComplete={isSigningUp ? "new-password" : "current-password"}
                accessibilityLabel="Password"
                onSubmitEditing={() => void (isSigningUp ? submitSignUp() : submit())}
                returnKeyType="go"
              />
              <Pressable
                onPress={() => setPasswordVisible((visible) => !visible)}
                style={styles.passwordVisibilityToggle}
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
              >
                <Image
                  source={passwordVisible ? hidePasswordImage : seePasswordImage}
                  style={styles.passwordVisibilityIcon}
                  resizeMode="contain"
                  accessible={false}
                />
              </Pressable>
            </View>
            {isSigningUp ? <AppText style={[styles.hint, darkMode && styles.darkLabel]}>Use at least 8 characters.</AppText> : null}
            {isSigningUp ? (
              <>
                <AppText style={[styles.label, darkMode && styles.darkLabel]}>Confirm password</AppText>
                <View style={styles.passwordRow}>
                  <AppTextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    style={[styles.input, styles.passwordInput, darkMode && styles.darkInput]}
                    placeholder="Confirm password"
                    placeholderTextColor={darkMode ? "#9bb8c2" : "#9a7a4a"}
                    secureTextEntry={!confirmPasswordVisible}
                    textContentType="newPassword"
                    autoComplete="new-password"
                    accessibilityLabel="Confirm password"
                    onSubmitEditing={() => void submitSignUp()}
                    returnKeyType="go"
                  />
                  <Pressable
                    onPress={() => setConfirmPasswordVisible((visible) => !visible)}
                  style={styles.passwordVisibilityToggle}
                    accessibilityRole="button"
                    accessibilityLabel={confirmPasswordVisible ? "Hide confirm password" : "Show confirm password"}
                  >
                    <Image
                      source={confirmPasswordVisible ? hidePasswordImage : seePasswordImage}
                      style={styles.passwordVisibilityIcon}
                      resizeMode="contain"
                      accessible={false}
                    />
                  </Pressable>
                </View>
                {confirmPassword && password !== confirmPassword ? (
                  <AppText style={styles.error}>Passwords do not match.</AppText>
                ) : null}
              </>
            ) : null}
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            <View style={styles.actions}>
              <Pressable
                onPress={() => void (isSigningUp ? submitSignUp() : submit())}
                style={[styles.submitButton, darkMode && styles.darkSubmitButton, (!identifier.trim() || !password || (isSigningUp && ((email.trim() !== "" && !validEmail) || !confirmPassword || password !== confirmPassword || password.length < 8 || userIdExists || checkingId || emailExists || checkingEmail || phoneExists || checkingPhone || gradesLoading || selectedGradeId === null || !!gradesError || !!emailCheckError)) || saving) && styles.disabledButton]}
                disabled={!identifier.trim() || !password || (isSigningUp && ((email.trim() !== "" && !validEmail) || !confirmPassword || password !== confirmPassword || password.length < 8 || userIdExists || checkingId || emailExists || checkingEmail || phoneExists || checkingPhone || gradesLoading || selectedGradeId === null || !!gradesError || !!emailCheckError)) || saving}
                accessibilityRole="button"
              >
                <AppText style={[styles.submitText, darkMode && styles.darkText]}>{saving ? (isSigningUp ? "Creating..." : "Signing in...") : (isSigningUp ? "Create account" : "Log in")}</AppText>
              </Pressable>
              <View style={styles.secondaryActions}>
                <Pressable onPress={() => switchMode(!isSigningUp)} style={styles.modeButton} disabled={saving}>
                  <AppText style={[styles.modeText, darkMode && styles.darkText]}>
                    {isSigningUp ? "Already have an account? Log in" : "New here? Sign up"}
                  </AppText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(35, 22, 12, 0.58)",
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: 390,
    padding: 22,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: "#f4b942",
    backgroundColor: "#fff4d0",
  },
  darkCard: {
    backgroundColor: "#242c35",
    borderColor: "#15add3",
  },
  title: {
    paddingRight: 34,
    marginBottom: 16,
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 24,
  },
  darkText: {
    color: "#ffffff",
  },
  label: {
    color: "#6b4a28",
    fontFamily: "FredokaBold",
    fontSize: 13,
  },
  darkLabel: {
    color: "#b8dce8",
  },
  input: {
    height: 44,
    marginTop: 5,
    marginBottom: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d6a338",
    backgroundColor: "#fffaf0",
    color: "#503617",
    fontFamily: "FredokaMedium",
    fontSize: 15,
  },
  gradeSelect: {
    justifyContent: "center",
  },
  gradeSelectText: {
    color: "#503617",
    fontFamily: "FredokaMedium",
    fontSize: 15,
  },
  gradePlaceholder: {
    color: "#9a7a4a",
  },
  gradeDropdown: {
    maxHeight: 180,
    marginTop: -8,
    marginBottom: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#d6a338",
    borderRadius: 12,
    backgroundColor: "#fffaf0",
  },
  darkGradeDropdown: {
    borderColor: "#15add3",
    backgroundColor: "#172029",
  },
  gradeOption: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  selectedGradeOption: {
    backgroundColor: "#f4dfaa",
  },
  darkGradeOption: {
    backgroundColor: "#24323d",
  },
  darkSelectedGradeOption: {
    backgroundColor: "#17677b",
  },
  gradeOptionText: {
    color: "#503617",
    fontFamily: "FredokaMedium",
    fontSize: 14,
  },
  userIdRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  passwordInput: {
    flex: 1,
  },
  passwordVisibilityToggle: {
    width: 44,
    height: 44,
    marginTop: 5,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#f4dfaa",
  },
  passwordVisibilityIcon: {
    width: 36,
    height: 36,
  },
  userIdInput: {
    flex: 1,
  },
  regenerateButton: {
    width: 44,
    height: 44,
    marginTop: 5,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d6a338",
    backgroundColor: "#f4b942",
  },
  darkRegenerateButton: {
    borderColor: "#15add3",
    backgroundColor: "#15add3",
  },
  regenerateText: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 23,
    lineHeight: 27,
  },
  darkInput: {
    borderColor: "#15add3",
    backgroundColor: "#172029",
    color: "#ffffff",
  },
  error: {
    marginTop: -4,
    color: "#b42318",
    fontFamily: "FredokaRegular",
    fontSize: 13,
  },
  actions: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
    marginTop: 16,
  },
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  closeButton: {
    position: "absolute",
    zIndex: 1,
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#f4dfaa",
  },
  darkCloseButton: {
    backgroundColor: "#354450",
  },
  closeText: {
    color: "#6b4a28",
    fontFamily: "FredokaBold",
    fontSize: 25,
    lineHeight: 29,
  },
  modeButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  modeText: {
    color: "#6b4a28",
    fontFamily: "FredokaBold",
    fontSize: 13,
  },
  hint: {
    marginTop: -10,
    marginBottom: 8,
    color: "#6b4a28",
    fontFamily: "FredokaRegular",
    fontSize: 12,
  },
  submitButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#f4b942",
    borderWidth: 1,
    borderColor: "#e4a928",
    shadowColor: "#8e5a17",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  darkSubmitButton: {
    backgroundColor: "#15add3",
  },
  disabledButton: {
    opacity: 0.55,
  },
  submitText: {
    color: "#503617",
    fontFamily: "FredokaBold",
  },
});
