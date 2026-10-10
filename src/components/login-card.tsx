import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { getAuthToken, postAuthLogin } from "../lib/api";
import AppText from "./app-text";
import AppTextInput from "./app-text-input";

type LoginCardProps = {
  visible: boolean;
  darkMode?: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function LoginCard({
  visible,
  darkMode = false,
  onClose,
  onSuccess,
}: LoginCardProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
      setPassword("");
      onSuccess();
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
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <AppText style={[styles.title, darkMode && styles.darkText]}>Log in</AppText>
            <AppText style={[styles.label, darkMode && styles.darkLabel]}>User ID or email</AppText>
            <AppTextInput
              value={identifier}
              onChangeText={setIdentifier}
              style={[styles.input, darkMode && styles.darkInput]}
              placeholder="User ID or email"
              placeholderTextColor={darkMode ? "#9bb8c2" : "#9a7a4a"}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              autoComplete="username"
              accessibilityLabel="User ID or email"
            />
            <AppText style={[styles.label, darkMode && styles.darkLabel]}>Password</AppText>
            <AppTextInput
              value={password}
              onChangeText={setPassword}
              style={[styles.input, darkMode && styles.darkInput]}
              placeholder="Password"
              placeholderTextColor={darkMode ? "#9bb8c2" : "#9a7a4a"}
              secureTextEntry
              textContentType="password"
              autoComplete="current-password"
              accessibilityLabel="Password"
              onSubmitEditing={() => void submit()}
              returnKeyType="go"
            />
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.cancelButton} disabled={saving}>
                <AppText style={[styles.cancelText, darkMode && styles.darkText]}>Cancel</AppText>
              </Pressable>
              <Pressable
                onPress={() => void submit()}
                style={[styles.submitButton, darkMode && styles.darkSubmitButton, (!identifier.trim() || !password || saving) && styles.disabledButton]}
                disabled={!identifier.trim() || !password || saving}
                accessibilityRole="button"
              >
                <AppText style={[styles.submitText, darkMode && styles.darkText]}>{saving ? "Signing in..." : "Log in"}</AppText>
              </Pressable>
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
    fontFamily: "FredokaRegular",
    fontSize: 15,
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
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  cancelText: {
    color: "#6b4a28",
    fontFamily: "FredokaBold",
  },
  submitButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#f4b942",
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