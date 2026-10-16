import AppText from "../../app-text";
import { useEffect, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, View } from "react-native";
import { useKidoLanguage } from "../../../lib/language-context";

const profileAnimationFrameCounts = { 1: 7, 2: 8 } as const;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ProfileGradeCardProps = {
  isWeb?: boolean;
  compact?: boolean;
  behindOverview?: boolean;
  selectorProgress?: Animated.Value;
  grade?: number | string;
  verticalOffset?: number;
  horizontalOffset?: number;
  onPress?: () => void;
  player?: 1 | 2;
};

export default function ProfileGradeCard({
  isWeb = false,
  compact = false,
  behindOverview = false,
  selectorProgress,
  grade = 1,
  verticalOffset = 0,
  horizontalOffset = 0,
  onPress,
  player = 1,
}: ProfileGradeCardProps) {
  const [profileAnimationFrame, setProfileAnimationFrame] = useState(0);
  const profileAnimationFrameCount = profileAnimationFrameCounts[player];
  const { language } = useKidoLanguage();
  const rawGradeLabel = String(grade).trim() || `Grade ${grade}`;
  const gradeLabel = language === "SW"
    ? rawGradeLabel
        .replace(/^(?:grade|standard|std\.?|class)\s*(\d+)$/i, "Darasa la $1")
        .replace(/^form\s*(\d+)$/i, "Kidato cha $1")
        .replace(/^pre[- ]?primary$/i, "Elimu ya awali")
        .replace(/^nursery$/i, "Chekechea")
    : rawGradeLabel;

  useEffect(() => {
    let animation: ReturnType<typeof setTimeout>;
    const scheduleNextFrame = (frame: number) => {
      animation = setTimeout(() => {
        const nextFrame = (frame + 1) % profileAnimationFrameCount;
        setProfileAnimationFrame(nextFrame);
        scheduleNextFrame(nextFrame);
      }, frame < 2 ? 5000 : 180);
    };

    scheduleNextFrame(0);

    return () => clearTimeout(animation);
  }, [profileAnimationFrameCount]);

  return (
    <>
      <Pressable
        style={[
          styles.profileCard,
          isWeb && styles.webProfileCard,
          compact && styles.compactProfileCard,
          {
            ...(behindOverview ? { zIndex: 29, elevation: 19 } : {}),
            transform: [
              { translateX: horizontalOffset },
              { translateY: verticalOffset },
            ],
          },
        ]}
        hitSlop={10}
        accessibilityLabel="Player profile"
        accessibilityRole="button"
        onPress={onPress}
      >
        <Image
          source={player === 2 ? require("../../../assets/players/profile-animation2.png") : require("../../../assets/players/profile-animation.png")}
          style={[
            styles.profilePicture,
            isWeb && styles.webProfilePicture,
            compact && styles.compactProfilePicture,
            {
              width: (compact ? 64 : isWeb ? 86 : 58) * profileAnimationFrameCount,
              left: -(compact ? 64 : isWeb ? 86 : 58) * profileAnimationFrame,
            },
          ]}
          resizeMode="contain"
        />
      </Pressable>
      <AnimatedPressable
        style={[
          styles.gradeCard,
          isWeb && styles.webGradeCard,
          !isWeb && styles.mobileGradeCard,
          compact && styles.compactGradeCard,
          {
            ...(behindOverview ? { zIndex: 29, elevation: 19 } : {}),
            transform: [
              { translateX: horizontalOffset },
              { translateY: verticalOffset },
              { translateX: selectorProgress?.interpolate({ inputRange: [0, 1], outputRange: [0, 120] }) ?? 0 },
            ],
          },
        ]}
        hitSlop={10}
        accessibilityLabel={gradeLabel}
        accessibilityRole="button"
        onPress={onPress}
      >
        <AppText style={[styles.gradeText, isWeb && styles.webGradeText, compact && styles.compactGradeText]}>{gradeLabel}</AppText>
      </AnimatedPressable>
    </>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    position: "absolute",
    top: 18,
    left: 18,
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 244, 208, 0.92)",
    borderColor: "#f4b942",
    borderWidth: 3,
    borderRadius: 22,
    shadowColor: "#5b3218",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
    overflow: "hidden",
    zIndex: 500,
    elevation: 500,
  },
  webProfileCard: {
    top: 24,
    left: 24,
    width: 104,
    height: 104,
    borderRadius: 28,
  },
  compactProfileCard: {
    top: 18,
    left: 18,
    width: 76,
    height: 76,
    borderRadius: 22,
  },
  profilePicture: {
    position: "absolute",
    height: 67,
  },
  webProfilePicture: {
    height: 99,
  },
  compactProfilePicture: {
    height: 74,
  },
  gradeCard: {
    position: "absolute",
    top: 98,
    left: 18,
    width: 72,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 244, 208, 0.92)",
    borderColor: "#f4b942",
    borderWidth: 3,
    borderRadius: 14,
    shadowColor: "#5b3218",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 500,
    elevation: 500,
  },
  webGradeCard: {
    top: 136,
    left: 24,
    width: 104,
    height: 50,
    borderRadius: 18,
    zIndex: 500,
    elevation: 500,
  },
  mobileGradeCard: {
    zIndex: 33,
    elevation: 19,
  },
  compactGradeCard: {
    top: 98,
    left: 18,
    width: 76,
    height: 38,
    borderRadius: 14,
  },
  gradeText: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 12,
    textAlign: "center",
  },
  webGradeText: {
    fontSize: 16,
  },
  compactGradeText: {
    fontSize: 12,
  },
});
