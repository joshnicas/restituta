import AppText from "../../app-text";
import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

type ResetBarProps = {
  onContinue?: () => void;
  isWeb?: boolean;
};

export default function ResetBar({
  onContinue,
  isWeb = false,
}: ResetBarProps) {
  const [bounce] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -10,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.spring(bounce, {
          toValue: 0,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      bounce.setValue(0);
    };
  }, [bounce]);

  return (
    <View style={[styles.container, isWeb && styles.webContainer]}>
      <Animated.View
        style={{ transform: [{ translateY: bounce }] }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          onPress={onContinue}
          style={({ pressed }) => [
            styles.button,
            isWeb && styles.webButton,
            pressed && styles.pressedButton,
          ]}
        >
          <AppText style={styles.buttonText}>Continue</AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    height: 72,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    zIndex: 2,
  },
  webContainer: {
    height: 48,
    marginTop: 12,
  },
  button: {
    width: 190,
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffb703",
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderWidth: 2,
    borderColor: "#fff6d6",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  webButton: {
    minHeight: 48,
  },
  pressedButton: {
    backgroundColor: "#e39f00",
    opacity: 0.9,
  },
  buttonText: {
    color: "#fff",
    fontFamily: "FredokaBold",
    fontSize: 26,
    letterSpacing: 0.5,
  },
});