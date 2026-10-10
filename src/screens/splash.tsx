import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, View } from "react-native";
import AppText from "../components/app-text";
import { API_BASE } from "../lib/config";

const ANIM_DURATION = 3000 + 500 + 1200 + 800; // must match the animation sequence below

async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${API_BASE}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok || res.status < 500; // treat any non-5xx as "reachable"
  } catch {
    // Network error, DNS failure, abort, etc.
    return false;
  }
}

export default function Splash() {
  const router = useRouter();
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // "ready" = animation done, "online" = connectivity result
  const [animDone, setAnimDone] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const runCheck = useCallback(async () => {
    setChecking(true);
    setOnline(null);
    const result = await checkConnectivity();
    setOnline(result);
    setChecking(false);
  }, []);

  // Start animation + connectivity check in parallel on mount
  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(1500),
      Animated.timing(logoOpacity, { toValue: 1, duration: 2000, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(logoOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]);

    const timeout = setTimeout(() => setAnimDone(true), ANIM_DURATION);
    animation.start();
    void runCheck();

    return () => {
      animation.stop();
      clearTimeout(timeout);
    };
  }, [logoOpacity, runCheck]);

  // Navigate only when BOTH the animation is done AND we confirmed connectivity
  useEffect(() => {
    if (animDone && online === true) {
      router.replace("/home");
    }
  }, [animDone, online, router]);

  const showError = animDone && online === false;

  return (
    <View style={styles.container}>
      <LottieView
        source={require("../assets/12345.json")}
        autoPlay
        loop={false}
        resizeMode="contain"
        style={styles.lottie}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.logoOverlay,
          {
            opacity: logoOpacity,
            transform: [
              {
                scale: logoOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Image source={require("../assets/logo.png")} style={styles.logo} />
      </Animated.View>

      {showError && (
        <View style={styles.errorBox}>
          <AppText style={styles.errorEmoji}>📡</AppText>
          <AppText style={styles.errorTitle}>No Connection</AppText>
          <AppText style={styles.errorBody}>
            We could not reach the server. Please check your internet connection and try again.
          </AppText>
          <Pressable
            style={[styles.retryButton, checking && styles.retryButtonDisabled]}
            onPress={() => { if (!checking) void runCheck(); }}
            disabled={checking}
            accessibilityRole="button"
            accessibilityLabel="Retry connection"
          >
            <AppText style={styles.retryText}>
              {checking ? "Checking…" : "Try Again"}
            </AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#008ba7",
    justifyContent: "center",
    alignItems: "center",
  },
  lottie: {
    width: 220,
    height: 220,
  },
  logoOverlay: {
    position: "absolute",
  },
  logo: {
    width: 140,
    height: 140,
    resizeMode: "contain",
  },
  errorBox: {
    position: "absolute",
    bottom: 60,
    left: 28,
    right: 28,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  errorEmoji: {
    fontSize: 40,
  },
  errorTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontFamily: "FredokaBold",
    textAlign: "center",
  },
  errorBody: {
    color: "#d6f0f7",
    fontSize: 14,
    fontFamily: "FredokaRegular",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 2,
  },
  retryButton: {
    marginTop: 14,
    backgroundColor: "#f4b942",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryText: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 16,
    textTransform: "uppercase",
  },
});
