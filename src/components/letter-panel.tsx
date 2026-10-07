import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewProps } from "react-native";

type LetterPanelProps = ViewProps & {
  children: ReactNode;
  open: boolean;
  darkMode?: boolean;
};

export default function LetterPanel({
  children,
  open,
  darkMode = false,
  style,
  ...props
}: LetterPanelProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.spring(progress, {
          toValue: 1,
          friction: 8,
          tension: 90,
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.delay(220),
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(progress, {
        toValue: 0,
        friction: 8,
        tension: 90,
        useNativeDriver: false,
      }),
    ]).start();
  }, [contentOpacity, open, progress]);

  return (
    <View {...props} style={[styles.panel, style]}>
      <Animated.Image
        source={
          darkMode
            ? require("../assets/letter-panel/dark-level.png")
            : require("../assets/letter-panel/full.png")
        }
        resizeMode="stretch"
        style={[styles.full, { transform: [{ scaleY: progress }] }]}
      />
      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: "100%",
    height: 640,
    position: "relative",
    alignItems: "center",
  },
  full: {
    position: "absolute",
    top: 0,
    width: "110%",
    height: 550,
    zIndex: 1,
  },
  content: {
    position: "absolute",
    top: -19,
    left: "20%",
    width: "60%",
    height: "100%",
    paddingHorizontal: 0,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 150,
    paddingBottom: 50,
    zIndex: 2,
  },
});
