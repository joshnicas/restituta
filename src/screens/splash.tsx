import { Asset } from "expo-asset";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { API_BASE } from "../lib/config";

const homeBackgroundAssets = [
  require("../assets/background.png"),
  require("../assets/night.background.png"),
  require("../assets/lands/kilimanjaro-web.png"),
  require("../assets/lands/kilimanjaro.png"),
  require("../assets/lands/kilimanjaro/tree.png"),
  require("../assets/lands/kilimanjaro/branch1.png"),
  require("../assets/lands/mwanza-web.png"),
  require("../assets/lands/mwanza.png"),
];

const loadingMessages = [
  "Connecting to Kido",
  "Warming up your adventure",
  "Getting the play lands ready",
  "Almost there, little explorer",
];

const wait = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

const assets = {
  k: require("../assets/logo/kido_k.png"),
  iStem: require("../assets/logo/kido_i_stem.png"),
  iDot: require("../assets/logo/kido_i_dot.png"),
  d: require("../assets/logo/kido_d.png"),
  o: require("../assets/logo/kido_o.png"),
};

// Natural PNG dimensions; use explicit values because resolveAssetSource is
// unavailable during Expo Web's server-side static rendering.
const dimensions = {
  k: { width: 608, height: 626 },
  iStem: { width: 303, height: 500 },
  iDot: { width: 251, height: 256 },
  d: { width: 500, height: 562 },
  o: { width: 555, height: 583 },
};

const aspect = {
  k: dimensions.k.width / dimensions.k.height,
  iStem: dimensions.iStem.width / dimensions.iStem.height,
  iDot: dimensions.iDot.width / dimensions.iDot.height,
  d: dimensions.d.width / dimensions.d.height,
  o: dimensions.o.width / dimensions.o.height,
};

// Overlap the image boxes enough to cancel the PNGs' transparent side margins.
const horizontalGapRatio = -0.16;
const iStemHeightRatio = 0.68;
const iDotHeightRatio = 0.39;
// The PNGs have a 24px transparent border; overlap their boxes so visible pixels meet.
const iDotGapRatio = -0.055;
const wordAspect =
  aspect.k + aspect.iStem * iStemHeightRatio + aspect.d + aspect.o + horizontalGapRatio * 3;

export default function Splash() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    FredokaBold: require("../assets/fonts/Fredoka-Bold.ttf"),
    FredokaMedium: require("../assets/fonts/Fredoka-Medium.ttf"),
  });
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [logoDone, setLogoDone] = useState(false);
  const [lottieDone, setLottieDone] = useState(false);
  const [backgroundsReady, setBackgroundsReady] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [connectionRetry, setConnectionRetry] = useState(0);
  const [navigationReady, setNavigationReady] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const mounted = useRef(false);
  const logoStarted = useRef(false);

  const [kX] = useState(() => new Animated.Value(-13));
  const [kPushX] = useState(() => new Animated.Value(0));
  const [stemOpacity] = useState(() => new Animated.Value(0));
  const [stemPushX] = useState(() => new Animated.Value(0));
  const [dX] = useState(() => new Animated.Value(-10));
  const [dPushX] = useState(() => new Animated.Value(0));
  const [oX] = useState(() => new Animated.Value(0));
  const [oRotation] = useState(() => new Animated.Value(0));
  const [dotY] = useState(() => new Animated.Value(0));
  const [revealOpacity] = useState(() => new Animated.Value(0.78));
  const [revealScale] = useState(() => new Animated.Value(0.96));
  const [loadingPulse] = useState(() => new Animated.Value(0));
  const sequenceRef = useRef<Animated.CompositeAnimation | null>(null);

  const capHeight = Math.min(50, Math.max(1, (screenWidth - 56) / wordAspect));
  const gap = capHeight * horizontalGapRatio;
  const stemHeight = capHeight * iStemHeightRatio;
  const stemWidth = stemHeight * aspect.iStem;
  const dotHeight = capHeight * iDotHeightRatio;
  const dotWidth = dotHeight * aspect.iDot;
  const dotTop = capHeight - stemHeight - capHeight * iDotGapRatio - dotHeight;

  const startLogo = useCallback(() => {
    if (logoStarted.current) return;
    logoStarted.current = true;
    oX.setValue(screenWidth + capHeight * aspect.o);
    oRotation.setValue(0);
    dotY.setValue(0);

    const gentleSpring = { toValue: 0, useNativeDriver: true, tension: 92, friction: 8 };
    const otherLetters = Animated.parallel([
      Animated.sequence([
        Animated.delay(70),
        Animated.spring(kX, gentleSpring),
      ]),
      Animated.timing(stemOpacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(100),
        Animated.spring(dX, { ...gentleSpring, toValue: 0 }),
      ]),
    ]);
    const rollingDuration = 560;
    const impact = Animated.parallel([
      Animated.sequence([
        Animated.timing(oX, {
          toValue: 0,
          duration: rollingDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(oX, {
          toValue: -capHeight * 0.035,
          useNativeDriver: true,
          tension: 150,
          friction: 5,
        }),
        Animated.spring(oX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
      ]),
      Animated.timing(oRotation, {
        toValue: 1,
        duration: rollingDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(rollingDuration - 95),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(kPushX, { toValue: -capHeight * 0.075, duration: 75, useNativeDriver: true }),
            Animated.spring(kPushX, { toValue: 0, useNativeDriver: true, tension: 170, friction: 5 }),
          ]),
          Animated.sequence([
            Animated.timing(stemPushX, { toValue: -capHeight * 0.09, duration: 75, useNativeDriver: true }),
            Animated.spring(stemPushX, { toValue: 0, useNativeDriver: true, tension: 165, friction: 5 }),
          ]),
          Animated.sequence([
            Animated.timing(dPushX, { toValue: -capHeight * 0.065, duration: 75, useNativeDriver: true }),
            Animated.spring(dPushX, { toValue: 0, useNativeDriver: true, tension: 155, friction: 5 }),
          ]),
          Animated.sequence([
            Animated.timing(dotY, {
              toValue: -capHeight * 0.3,
              duration: 85,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(dotY, {
              toValue: capHeight * 0.035,
              duration: 190,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.spring(dotY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 150,
              friction: 5,
            }),
          ]),
        ]),
      ]),
    ]);

    sequenceRef.current = Animated.sequence([
      otherLetters,
      impact,
      Animated.parallel([
        Animated.timing(revealOpacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(revealScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 12,
        }),
      ]),
    ]);
    sequenceRef.current.start(({ finished }) => {
      if (finished && mounted.current) setLogoDone(true);
    });
  }, [capHeight, dPushX, dX, dotY, kPushX, kX, oRotation, oX, revealOpacity, revealScale, screenWidth, stemOpacity, stemPushX]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      sequenceRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setServerReady(false);
    setConnectionFailed(false);

    const checkConnection = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5_000);
        try {
          const response = await fetch(`${API_BASE}/`, { signal: controller.signal });
          if (!response.ok) throw new Error(`Server returned ${response.status}`);
          if (active) setServerReady(true);
          return;
        } catch {
          if (attempt < 2) await wait(1_000);
        } finally {
          clearTimeout(timeout);
        }
      }
      if (active) setConnectionFailed(true);
    };

    void checkConnection();
    return () => { active = false; };
  }, [connectionRetry]);

  useEffect(() => {
    let active = true;
    void Asset.loadAsync(homeBackgroundAssets)
      .catch(() => undefined)
      .finally(() => {
        if (active) setBackgroundsReady(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!logoDone || connectionFailed) return;
    const messageTimer = setInterval(() => {
      setLoadingMessageIndex((index) => (index + 1) % loadingMessages.length);
    }, 1800);
    return () => clearInterval(messageTimer);
  }, [connectionFailed, logoDone]);

  useEffect(() => {
    if (!logoDone || connectionFailed) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingPulse, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(loadingPulse, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [connectionFailed, loadingPulse, logoDone]);

  useEffect(() => {
    if (!lottieDone || !logoDone || !backgroundsReady || !serverReady || !fontsLoaded) return;
    const timer = setTimeout(() => setNavigationReady(true), 650);
    return () => clearTimeout(timer);
  }, [backgroundsReady, fontsLoaded, lottieDone, logoDone, serverReady]);

  useEffect(() => {
    if (navigationReady) router.replace("/home");
  }, [navigationReady, router]);

  const handleLottieFinish = (cancelled: boolean) => {
    if (cancelled || !mounted.current) return;
    setLottieDone(true);
    startLogo();
  };

  return (
    <View style={styles.container}>
      <LottieView
        source={require("../assets/12345.json")}
        autoPlay
        loop={false}
        resizeMode="contain"
        style={styles.lottie}
        onAnimationFinish={handleLottieFinish}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.logoOverlay,
          {
            width: capHeight * wordAspect,
            height: capHeight,
            opacity: revealOpacity,
            transform: [
              { translateY: Platform.OS === "web" ? -12 : 0 },
              { scale: revealScale },
            ],
          },
        ]}
      >
        <Animated.Image
          source={assets.k}
          resizeMode="contain"
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: capHeight * aspect.k,
            height: capHeight,
            opacity: stemOpacity,
            transform: [{ translateX: Animated.add(kX, kPushX) }],
          }}
        />
        <View
          style={{
            position: "absolute",
            left: capHeight * aspect.k + gap,
            bottom: 0,
            width: stemWidth,
            height: capHeight,
          }}
        >
          <Animated.Image
            source={assets.iStem}
            resizeMode="contain"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: stemWidth,
              height: stemHeight,
              opacity: stemOpacity,
              transform: [{ translateX: stemPushX }],
            }}
          />
          <Animated.Image
            source={assets.iDot}
            resizeMode="contain"
            style={{
              position: "absolute",
              top: dotTop,
              left: (stemWidth - dotWidth) / 2,
              width: dotWidth,
              height: dotHeight,
              opacity: stemOpacity,
              transform: [{ translateY: dotY }],
            }}
          />
        </View>
        <Animated.Image
          source={assets.d}
          resizeMode="contain"
          style={{
            position: "absolute",
            left: capHeight * aspect.k + gap + stemWidth + gap,
            bottom: 0,
            width: capHeight * aspect.d,
            height: capHeight,
            opacity: stemOpacity,
            transform: [{ translateX: Animated.add(dX, dPushX) }],
          }}
        />
        <Animated.Image
          source={assets.o}
          resizeMode="contain"
          style={{
            position: "absolute",
            left: capHeight * aspect.k + gap + stemWidth + gap + capHeight * aspect.d + gap,
            bottom: 0,
            width: capHeight * aspect.o,
            height: capHeight,
            opacity: stemOpacity,
            transform: [
              { translateX: oX },
              { rotate: oRotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "720deg"] }) },
            ],
          }}
        />
      </Animated.View>

      {logoDone && !navigationReady && !connectionFailed && (
        <View
          pointerEvents="none"
          style={[styles.loadingStatus, { top: (screenHeight + capHeight) / 2 + 72 }]}
        >
          <View style={styles.loadingCard}>
            <View style={styles.loadingSparkle}>
              <Text style={styles.loadingSparkleText}>✦</Text>
            </View>
            <Text style={styles.loadingText}>{loadingMessages[loadingMessageIndex]}</Text>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((dot) => (
              <Animated.View
                key={dot}
                style={[
                  styles.loadingDot,
                  {
                    opacity: loadingPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: dot === 1 ? [0.45, 1] : [0.7, 1],
                    }),
                    transform: [{ translateY: loadingPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, dot === 1 ? -4 : -2],
                    }) }],
                  },
                ]}
              />
            ))}
          </View>
          </View>
        </View>
      )}
      {logoDone && connectionFailed && (
        <View
          style={[styles.connectionError, { top: (screenHeight + capHeight) / 2 + (Platform.OS === "web" ? -8 : 68) }]}
        >
          <View style={styles.connectionCard}>
            <Image
              source={require("../assets/sad-network.png")}
              resizeMode="contain"
              style={styles.errorIcon}
              accessibilityLabel="No network connection"
            />
            <Text style={styles.connectionTitle}>Adventure paused</Text>
            <Text style={styles.connectionErrorText}>
              We couldn’t reach Kido. Check your internet connection, then try again.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setConnectionFailed(false);
                setConnectionRetry((attempt) => attempt + 1);
              }}
              style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
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
  loadingStatus: {
    position: "absolute",
    left: 12,
    right: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCard: {
    minWidth: 250,
    maxWidth: 360,
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "rgba(255, 239, 169, 0.95)",
    backgroundColor: "rgba(0, 111, 139, 0.82)",
    shadowColor: "#003c57",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.27,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingSparkle: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#ffd45d",
  },
  loadingSparkleText: { color: "#08738a", fontSize: 22, fontWeight: "900" },
  loadingText: {
    color: "#fff8d8",
    fontFamily: "FredokaBold",
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "left",
    textShadowColor: "rgba(0, 57, 79, 0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  loadingDots: { flexDirection: "row", alignItems: "center", gap: 5, marginLeft: 1 },
  loadingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ffd45d" },
  connectionError: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  connectionCard: {
    width: "100%",
    maxWidth: 390,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 22,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#ffe5a0",
    backgroundColor: "rgba(0, 91, 121, 0.94)",
    shadowColor: "#00354c",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 7,
    gap: 12,
  },
  errorIcon: { width: 72, height: 72 },
  connectionTitle: {
    color: "#ffe08b",
    fontFamily: "FredokaBold",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  connectionErrorText: {
    maxWidth: 390,
    color: "#fff8d8",
    fontFamily: "FredokaMedium",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 23,
    textAlign: "center",
    textShadowColor: "rgba(0, 57, 79, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  retryButton: {
    minWidth: 152,
    minHeight: 48,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#ffe99e",
    backgroundColor: "#ffc12f",
    shadowColor: "#4a3007",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonPressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  retryButtonText: { color: "#573400", fontFamily: "FredokaBold", fontSize: 16, fontWeight: "800" },
});
