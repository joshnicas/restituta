import { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

const assets = {
  k: require("../assets/logo/kido_k.png"),
  iStem: require("../assets/logo/kido_i_stem.png"),
  iDot: require("../assets/logo/kido_i_dot.png"),
  d: require("../assets/logo/kido_d.png"),
  o: require("../assets/logo/kido_o.png"),
};

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

const horizontalGapRatio = -0.16;
const iStemHeightRatio = 0.68;
const iDotHeightRatio = 0.39;
const iDotGapRatio = -0.055;
const wordAspect =
  aspect.k + aspect.iStem * iStemHeightRatio + aspect.d + aspect.o + horizontalGapRatio * 3;

interface KidoAnimatedLogoProps {
  capHeight?: number;
  autoPlay?: boolean;
  delay?: number;
  interactive?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function KidoAnimatedLogo({
  capHeight = 36,
  autoPlay = true,
  delay = 100,
  interactive = true,
  onPress,
  style,
}: KidoAnimatedLogoProps) {
  const kX = useRef(new Animated.Value(-12)).current;
  const kPushX = useRef(new Animated.Value(0)).current;
  const stemOpacity = useRef(new Animated.Value(0)).current;
  const stemPushX = useRef(new Animated.Value(0)).current;
  const dX = useRef(new Animated.Value(-10)).current;
  const dPushX = useRef(new Animated.Value(0)).current;
  const oX = useRef(new Animated.Value(140)).current;
  const oRotation = useRef(new Animated.Value(0)).current;
  const dotY = useRef(new Animated.Value(0)).current;
  const revealOpacity = useRef(new Animated.Value(0.85)).current;
  const revealScale = useRef(new Animated.Value(0.96)).current;

  const sequenceRef = useRef<Animated.CompositeAnimation | null>(null);
  const isPlayingRef = useRef(false);

  const gap = capHeight * horizontalGapRatio;
  const stemHeight = capHeight * iStemHeightRatio;
  const stemWidth = stemHeight * aspect.iStem;
  const dotHeight = capHeight * iDotHeightRatio;
  const dotWidth = dotHeight * aspect.iDot;
  const dotTop = capHeight - stemHeight - capHeight * iDotGapRatio - dotHeight;
  const wordWidth = capHeight * wordAspect;

  const playAnimation = useCallback(() => {
    sequenceRef.current?.stop();
    isPlayingRef.current = true;

    // Reset initial values
    kX.setValue(-12);
    kPushX.setValue(0);
    stemOpacity.setValue(0);
    stemPushX.setValue(0);
    dX.setValue(-10);
    dPushX.setValue(0);
    oX.setValue(Math.max(120, capHeight * 3.5));
    oRotation.setValue(0);
    dotY.setValue(0);
    revealOpacity.setValue(0.85);
    revealScale.setValue(0.96);

    const gentleSpring = { toValue: 0, useNativeDriver: true, tension: 92, friction: 8 };

    const otherLetters = Animated.parallel([
      Animated.sequence([
        Animated.delay(60),
        Animated.spring(kX, gentleSpring),
      ]),
      Animated.timing(stemOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(90),
        Animated.spring(dX, { ...gentleSpring, toValue: 0 }),
      ]),
    ]);

    const rollingDuration = 520;
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
        Animated.delay(rollingDuration - 90),
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
              toValue: -capHeight * 0.32,
              duration: 85,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(dotY, {
              toValue: capHeight * 0.035,
              duration: 180,
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
          duration: 300,
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
      if (finished) isPlayingRef.current = false;
    });
  }, [capHeight, dPushX, dX, dotY, kPushX, kX, oRotation, oX, revealOpacity, revealScale, stemOpacity, stemPushX]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (autoPlay) {
      timer = setTimeout(() => {
        playAnimation();
      }, delay);
    }
    return () => {
      if (timer) clearTimeout(timer);
      sequenceRef.current?.stop();
    };
  }, [autoPlay, delay, playAnimation]);

  const handlePress = () => {
    if (onPress) onPress();
    if (interactive) {
      playAnimation();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!interactive && !onPress}
      accessibilityRole="button"
      accessibilityLabel="Kido Logo"
      style={[
        styles.container,
        {
          width: wordWidth,
          height: capHeight,
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.logoWrapper,
          {
            width: wordWidth,
            height: capHeight,
            opacity: revealOpacity,
            transform: [{ scale: revealScale }],
          },
        ]}
      >
        {/* Letter K */}
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

        {/* Letter I (Stem + Dot) */}
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

        {/* Letter D */}
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

        {/* Letter O (Rolling & Rotating in) */}
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
              {
                rotate: oRotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "720deg"],
                }),
              },
            ],
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
  },
  logoWrapper: {
    position: "relative",
    overflow: "visible",
  },
});
