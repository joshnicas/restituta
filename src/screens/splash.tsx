import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

const ANIM_DURATION = 3000 + 500 + 1200 + 800; // must match the animation sequence below

export default function Splash() {
  const router = useRouter();
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const [animDone, setAnimDone] = useState(false);

  // Play the intro, then continue without waiting on network access.
  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(1500),
      Animated.timing(logoOpacity, { toValue: 1, duration: 2000, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(logoOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]);

    const timeout = setTimeout(() => setAnimDone(true), ANIM_DURATION);
    animation.start();
    return () => {
      animation.stop();
      clearTimeout(timeout);
    };
  }, [logoOpacity]);

  useEffect(() => {
    if (animDone) {
      router.replace("/home");
    }
  }, [animDone, router]);

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
});
