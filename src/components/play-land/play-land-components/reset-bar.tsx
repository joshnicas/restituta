import AppText from "../../app-text";
import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

type ResetBarProps = {
  onContinue?: () => void;
  actionLabel?: string;
  actionVariant?: "second-attempt" | "continue" | "retry";
  isWeb?: boolean;
};

export default function ResetBar({
  onContinue,
  actionLabel = "Continue",
  actionVariant = "continue",
  isWeb = false,
}: ResetBarProps) {
  const [bounce] = useState(() => new Animated.Value(0));
  const actionButtonStyle =
    actionVariant === "second-attempt"
      ? styles.secondAttemptButton
      : actionVariant === "retry"
        ? styles.retryButton
        : styles.continueButton;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -5,
          duration: 620,
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
          accessibilityLabel={actionLabel}
          onPress={onContinue}
          style={({ pressed }) => [
            styles.button,
            actionButtonStyle,
            isWeb && styles.webButton,
            pressed && styles.pressedButton,
          ]}
        >
          {actionVariant === "continue" && (
            <View style={styles.buttonIcon}>
              <AppText style={styles.buttonIconText}>
                ★
              </AppText>
            </View>
          )}
          <AppText
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.84}
            style={styles.buttonText}
          >
            {actionLabel}
          </AppText>
          <AppText style={styles.buttonArrow}>›</AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    height: 82,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    zIndex: 2,
  },
  webContainer: {
    height: 66,
    marginTop: 10,
  },
  button: {
    width: 260,
    maxWidth: "92%",
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderBottomWidth: 2,
  },
  webButton: {
    minHeight: 58,
  },
  pressedButton: {
    transform: [{ translateY: 3 }],
    opacity: 0.94,
  },
  secondAttemptButton: {
    backgroundColor: "#168fe5",
    borderColor: "#8be6ff",
    borderBottomColor: "#8be6ff",
  },
  continueButton: {
    backgroundColor: "#25ad68",
    borderColor: "#a7f1c3",
    borderBottomColor: "#a7f1c3",
  },
  retryButton: {
    backgroundColor: "#f58232",
    borderColor: "#ffe0a6",
    borderBottomColor: "#ffe0a6",
  },
  buttonIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  buttonIconText: {
    color: "#fff",
    fontFamily: "FredokaBold",
    fontSize: 17,
  },
  buttonArrow: {
    color: "#fff",
    fontFamily: "FredokaBold",
    fontSize: 30,
    lineHeight: 32,
  },
  buttonText: {
    color: "#fff",
    fontFamily: "FredokaBold",
    flexShrink: 1,
    textAlign: "center",
    fontSize: 20,
    letterSpacing: 0.2,
  },
});
