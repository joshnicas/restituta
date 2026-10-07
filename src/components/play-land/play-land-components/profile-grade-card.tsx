import AppText from "../../app-text";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

const profileAnimationFrameCount = 7;

type ProfileGradeCardProps = {
  isWeb?: boolean;
  grade?: number | string;
  verticalOffset?: number;
  horizontalOffset?: number;
  onPress?: () => void;
};

export default function ProfileGradeCard({
  isWeb = false,
  grade = 1,
  verticalOffset = 0,
  horizontalOffset = 0,
  onPress,
}: ProfileGradeCardProps) {
  const [profileAnimationFrame, setProfileAnimationFrame] = useState(0);
  const gradeLabel = String(grade).toLowerCase()
    ? String(grade)
    : `Grade ${grade}`;

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
  }, []);

  return (
    <>
      <Pressable
        style={[
          styles.profileCard,
          isWeb && styles.webProfileCard,
          {
            transform: [
              { translateX: horizontalOffset },
              { translateY: verticalOffset },
            ],
          },
        ]}
        accessibilityLabel="Player profile"
        accessibilityRole="button"
        onPress={onPress}
      >
        <Image
          source={require("../../../assets/players/profile-animation.png")}
          style={[
            styles.profilePicture,
            isWeb && styles.webProfilePicture,
            {
              left: -(isWeb ? 86 : 58) * profileAnimationFrame,
            },
          ]}
          resizeMode="contain"
        />
      </Pressable>
      <View
        style={[
          styles.gradeCard,
          isWeb && styles.webGradeCard,
          {
            transform: [
              { translateX: horizontalOffset },
              { translateY: verticalOffset },
            ],
          },
        ]}
        accessibilityLabel={gradeLabel}
      >
        <AppText style={[styles.gradeText, isWeb && styles.webGradeText]}>{gradeLabel}</AppText>
      </View>
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
    zIndex: 30,
  },
  webProfileCard: {
    top: 24,
    left: 24,
    width: 104,
    height: 104,
    borderRadius: 28,
  },
  profilePicture: {
    position: "absolute",
    width: 58 * profileAnimationFrameCount,
    height: 67,
  },
  webProfilePicture: {
    width: 86 * profileAnimationFrameCount,
    height: 99,
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
    zIndex: 30,
  },
  webGradeCard: {
    top: 136,
    left: 24,
    width: 104,
    height: 50,
    borderRadius: 18,
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
});
