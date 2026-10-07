import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export function useIconShine(delay: number) {
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(shine, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shine, {
          toValue: 0,
          duration: 1,
          useNativeDriver: true,
        }),
        Animated.delay(1900),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delay, shine]);

  return shine;
}

type ShinyIconProps = {
  source: ImageSourcePropType;
  size: number;
  shine: Animated.Value;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export default function ShinyIcon({
  source,
  size,
  shine,
  style,
  imageStyle,
}: ShinyIconProps) {
  return (
    <View style={[styles.iconWrap, { width: size, height: size }, style]}>
      <Image
        source={source}
        style={[{ width: size, height: size }, imageStyle]}
        resizeMode="contain"
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.iconShine,
          {
            opacity: shine.interpolate({
              inputRange: [0, 0.45, 0.55, 1],
              outputRange: [0, 0.8, 0.8, 0],
            }),
            transform: [
              { translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-32, 32] }) },
              { rotate: "28deg" },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    overflow: "hidden",
    borderRadius: 8,
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
});
