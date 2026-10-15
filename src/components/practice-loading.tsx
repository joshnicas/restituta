import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import AppText from "./app-text";

const loadingHints = [
  "Gathering your questions…",
  "Waking up the quiz trail…",
  "Almost ready, sharpen those pencils!",
];

export default function PracticeLoading({
  dark = false,
  overlay = false,
  title = "Getting your practice ready…",
}: {
  dark?: boolean;
  overlay?: boolean;
  title?: string;
}) {
  const [hintIndex, setHintIndex] = useState(0);
  const bounce = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounceLoop = Animated.loop(Animated.sequence([
      Animated.timing(bounce, { toValue: 1, duration: 480, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 0, duration: 480, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]));
    const shimmerLoop = Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    bounceLoop.start();
    shimmerLoop.start();
    pulseLoop.start();
    const hintTimer = setInterval(() => setHintIndex((index) => (index + 1) % loadingHints.length), 2600);
    return () => {
      bounceLoop.stop();
      shimmerLoop.stop();
      pulseLoop.stop();
      clearInterval(hintTimer);
    };
  }, [bounce, pulse, shimmer]);

  const bounceY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -11] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] });
  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-150, 150] });

  return (
    <View style={[styles.frame, overlay && styles.overlay, dark && styles.darkOverlay]} accessibilityRole="progressbar" accessibilityLabel="Getting your practice ready">
      <View style={[styles.card, dark && styles.darkCard]}>
        <View style={styles.mascotArea}>
          <Animated.View style={[styles.halo, dark && styles.darkHalo, { transform: [{ scale: pulseScale }] }]} />
          <View style={styles.sparkleLeft}><AppText style={styles.sparkle}>✦</AppText></View>
          <View style={styles.sparkleRight}><AppText style={styles.sparkleSmall}>✧</AppText></View>
          <Animated.View style={[styles.mascot, { transform: [{ translateY: bounceY }, { rotate: bounce.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-5deg"] }) }] }]}>
            <AppText style={styles.mascotEmoji}>🦉</AppText>
          </Animated.View>
          <View style={styles.book}><AppText style={styles.bookEmoji}>📖</AppText></View>
        </View>
        <AppText style={[styles.title, dark && styles.darkText]}>{title}</AppText>
        <AppText style={[styles.hint, dark && styles.darkMuted]}>{loadingHints[hintIndex]}</AppText>
        <View style={[styles.track, dark && styles.darkTrack]}>
          <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]} />
        </View>
        <AppText style={[styles.footer, dark && styles.darkMuted]}>✨  Every great answer starts with a little thinking!</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: "100%", minHeight: 265, alignItems: "center", justifyContent: "center", padding: 14 },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, backgroundColor: "rgba(255,248,224,0.91)", padding: 22 },
  darkOverlay: { backgroundColor: "rgba(17,24,39,0.94)" },
  card: { width: "100%", maxWidth: 380, alignItems: "center", borderRadius: 28, paddingHorizontal: 22, paddingTop: 19, paddingBottom: 20, backgroundColor: "#fff4d0", borderWidth: 2, borderColor: "#e6b95b", shadowColor: "#75521b", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 12, elevation: 4 },
  darkCard: { backgroundColor: "#1f2937", borderColor: "#4b5563" },
  mascotArea: { width: 124, height: 104, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  halo: { position: "absolute", width: 82, height: 82, borderRadius: 41, backgroundColor: "#f8d77e" },
  darkHalo: { backgroundColor: "#374151" },
  mascot: { zIndex: 1 },
  mascotEmoji: { fontSize: 59 },
  sparkleLeft: { position: "absolute", left: 5, top: 20 },
  sparkleRight: { position: "absolute", right: 6, top: 9 },
  sparkle: { fontSize: 21, color: "#e9a523" },
  sparkleSmall: { fontSize: 19, color: "#78a85b" },
  book: { position: "absolute", right: 0, bottom: 2, transform: [{ rotate: "12deg" }] },
  bookEmoji: { fontSize: 27 },
  title: { fontFamily: "FredokaBold", color: "#503617", fontSize: 21, textAlign: "center" },
  hint: { fontFamily: "FredokaMedium", color: "#765a35", fontSize: 15, textAlign: "center", marginTop: 5, minHeight: 22 },
  track: { width: "100%", height: 9, borderRadius: 99, backgroundColor: "#f5e4b0", overflow: "hidden", marginTop: 16 },
  darkTrack: { backgroundColor: "#374151" },
  shimmer: { width: "42%", height: "100%", borderRadius: 99, backgroundColor: "#f1ad2f" },
  footer: { fontFamily: "FredokaRegular", color: "#856b47", fontSize: 12, textAlign: "center", marginTop: 13 },
  darkText: { color: "#f8fafc" },
  darkMuted: { color: "#cbd5e1" },
});
