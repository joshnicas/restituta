import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useRef } from "react";
import { Animated, Image, View } from "react-native";

export default function Splash() {
  const router = useRouter();
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(1500),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    const timeout = setTimeout(
      () => {
        router.replace("/home");
      },
      3000 + 500 + 1200 + 800,
    );

    animation.start();

    return () => {
      animation.stop();
      clearTimeout(timeout);
    };
  }, [logoOpacity, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#008ba7",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <LottieView
        source={require("../assets/12345.json")}
        autoPlay
        loop={false}
        resizeMode="contain"
        style={{
          width: 220,
          height: 220,
        }}
      />

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          opacity: logoOpacity,
          transform: [
            {
              scale: logoOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
        }}
      >
        <Image
          source={require("../assets/logo.png")}
          style={{
            width: 140,
            height: 140,
            resizeMode: "contain",
          }}
        />
      </Animated.View>
    </View>
  );
}
