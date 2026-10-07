import AppText from "../../app-text";
import { useAudioPlayer } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  StyleSheet,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useAudioPreferences } from "../../../lib/audio-preferences";

const timerSound = require("../../../assets/sound.effects/timer.mp3");

type TimerProps = {
  timerSource?: ImageSourcePropType;
  timerScale?: number;
  timerContentOffsetY?: number;
  duration?: number;
  onExpire?: () => void;
  isStarted?: boolean;
  currentQuestion?: number;
  totalQuestions?: number;
  correctCount?: number;
  wrongCount?: number;
  onTimeUpdate?: (timeLeft: number) => void;
  lives?: number;
  lifeCountdown?: string;
};
export default function Timer({
  timerSource,
  timerScale = 1,
  timerContentOffsetY = 0,
  duration = 60,
  onExpire,
  isStarted = false,
  currentQuestion,
  totalQuestions,
  correctCount = 0,
  wrongCount = 0,
  onTimeUpdate,
  lives = 3,
  lifeCountdown = "05:00",
}: TimerProps) {
  const timerPlayer = useAudioPlayer(timerSound);
  const { soundEnabled, preferencesLoaded } = useAudioPreferences();
  const timerContentScale = timerScale === 0 ? 1 : 1 / timerScale;
  const [timeLeft, setTimeLeft] = useState(duration);
  const pulse = useRef(new Animated.Value(1)).current;
  const onExpireRef = useRef(onExpire);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const playUrgentSound = preferencesLoaded && soundEnabled && isStarted && timeLeft > 0 && timeLeft <= duration * 0.25;

  useEffect(() => {
    onExpireRef.current = onExpire;
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onExpire, onTimeUpdate]);

  useEffect(() => {
    if (!isStarted) return;

    let remaining = duration;
    setTimeLeft(remaining);

    const interval = setInterval(() => {
      remaining = Math.max(remaining - 1, 0);
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onExpireRef.current?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, duration]);

  useEffect(() => {
    onTimeUpdateRef.current?.(timeLeft);
  }, [timeLeft]);

  useEffect(() => {
    if (playUrgentSound) {
      timerPlayer.loop = true;
      timerPlayer.seekTo(0);
      timerPlayer.play();
    } else {
      timerPlayer.pause();
      timerPlayer.loop = false;
    }
  }, [playUrgentSound, timerPlayer]);

  useEffect(() => {
    const shouldPulseFast = timeLeft <= 5;

    Animated.sequence([
      Animated.timing(pulse, {
        toValue: shouldPulseFast ? 1.08 : 1.12,
        duration: shouldPulseFast ? 260 : 220,
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1,
        duration: shouldPulseFast ? 320 : 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [timeLeft, pulse]);

  const progress = Math.max(0, Math.min(1, timeLeft / duration));
  const ringRadius = 30;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const remaining = ringCircumference * progress;
  const green = Math.round(255 * progress);
  const red = Math.round(80 + (1 - progress) * 175);
  const ringColor = `rgb(${red}, ${green}, 90)`;
  const ringStrokeWidth = timeLeft <= 5 ? 10 : 8;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.badge, { transform: [{ scale: timerScale }, { scale: pulse }] }]}
      >
        <Image
          source={
            timerSource ?? require("../../../assets/lands/kilimanjaro/timer.png")
          }
          style={styles.panelImage}
          resizeMode="contain"
        />
        <View
          style={[
            styles.timerContent,
            {
              transform: [
                { translateY: timerContentOffsetY / timerScale },
                { scale: timerContentScale },
              ],
            },
          ]}
        >
          <View style={styles.livesPanel} accessibilityLabel={`${lives} lives remaining`}>
            <View style={styles.livesRow}>
              {[0, 1, 2].map((life) => (
                <Image
                  key={life}
                  source={require("../../../assets/love.png")}
                  style={[styles.lifeIcon, life >= lives && styles.emptyLifeIcon]}
                  resizeMode="contain"
                />
              ))}
            </View>
            {lives < 3 ? <AppText style={styles.lifeCountdown}>+1 in {lifeCountdown}</AppText> : null}
          </View>
          <View style={styles.content}>
            <View style={styles.ringContainer}>
              <Svg width={80} height={80} viewBox="0 0 80 80">
                <Circle
                  cx={40}
                  cy={40}
                  r={ringRadius}
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth={ringStrokeWidth}
                  fill="transparent"
                />
                <Circle
                  cx={40}
                  cy={40}
                  r={ringRadius}
                  stroke={ringColor}
                  strokeWidth={ringStrokeWidth}
                  strokeLinecap="round"
                  fill="transparent"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={remaining}
                  rotation={-90}
                  originX={40}
                  originY={40}
                />
              </Svg>
              <AppText style={styles.time}>{`${timeLeft}s`}</AppText>
            </View>
          </View>
          {typeof currentQuestion !== "undefined" &&
          typeof totalQuestions !== "undefined" ? (
            <AppText
              style={styles.counter}
            >{`${currentQuestion}/${totalQuestions}`}</AppText>
          ) : null}
          <View style={[styles.counterBadge, { left: 8 }]}>
            <Image
              source={require("../../../assets/lands/kilimanjaro/correct.png")}
              style={styles.counterIcon}
              resizeMode="contain"
            />
            <AppText style={styles.counterNumber}>{correctCount}</AppText>
          </View>
          <View style={[styles.counterBadge, { left: 52 }]}>
            <Image
              source={require("../../../assets/lands/kilimanjaro/wrong.png")}
              style={styles.counterIcon}
              resizeMode="contain"
            />
            <AppText style={styles.counterNumber}>{wrongCount}</AppText>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 120,
    top: 80,
    zIndex: 30,
  },
  badge: {
    position: "relative",
    width: 148,
    height: 74,
    alignItems: "center",
    justifyContent: "center",
  },
  timerContent: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  livesPanel: {
    position: "absolute",
    right: 7,
    top: 60,
    alignItems: "center",
    zIndex: 3,
  },
  livesRow: { flexDirection: "row", alignItems: "center", gap: 1 },
  lifeIcon: { width: 15, height: 15 },
  emptyLifeIcon: { opacity: 0.35 },
  lifeCountdown: {
    color: "#fff",
    fontSize: 7,
    lineHeight: 9,
    fontFamily: "FredokaBold",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  panelImage: {
    position: "absolute",
    width: "500%",
    height: "500%",
    resizeMode: "stretch",
  },
  content: {
    position: "absolute",
    left: 8,
    top: 18,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  ringContainer: {
    bottom: -30,
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  time: {
    position: "absolute",
    zIndex: 2,
    fontSize: 16,
    color: "#fff",
    fontFamily: "FredokaBold",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    textAlign: "center",
  },
  counter: {
    position: "absolute",
    right: 12,
    bottom: -47,
    fontSize: 20,
    color: "#fffbfb",
    fontFamily: "FredokaBold",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    zIndex: 2,
  },
  counterBadge: {
    position: "absolute",
    bottom: -72,
    height: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    zIndex: 2,
  },
  counterIcon: {
    width: 20,
    height: 20,
    marginRight: 6,
  },
  counterNumber: {
    fontSize: 15,
    color: "#fff",
    fontFamily: "FredokaBold",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
