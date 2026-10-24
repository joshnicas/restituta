import AppText from "../../app-text";
import { useAudioPlayer } from "expo-audio";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useAudioPreferences } from "../../../lib/audio-preferences";
import ShinyIcon, { useIconShine } from "./shiny-icon";

const overviewPopSound = require("../../../assets/sound.effects/pop2.mp3");
const xpFillSound = require("../../../assets/sound.effects/xp_fill_game_sound.mp3");
const starSounds = [
  require("../../../assets/sound.effects/star-1.mp3"),
  require("../../../assets/sound.effects/star-2.mp3"),
  require("../../../assets/sound.effects/star-3.mp3"),
];

type OverviewProps = {
  duration: number;
  correct: number;
  wrong: number;
  starsEarned: number;
  xpEarned: number;
  pointsAcquired?: number;
  pointsRequired?: number;
  attemptMessage?: string;
  attemptStatus?: "passed" | "second-attempt" | "fresh-start";
  exitProgress?: Animated.Value;
};

export default function Overview({
  duration,
  correct,
  wrong,
  starsEarned,
  xpEarned,
  pointsAcquired = 0,
  pointsRequired = 0,
  attemptMessage,
  attemptStatus,
  exitProgress,
}: OverviewProps) {
  const { soundEnabled, preferencesLoaded } = useAudioPreferences();
  const popPlayer = useAudioPlayer(overviewPopSound);
  const starOnePlayer = useAudioPlayer(starSounds[0]);
  const starTwoPlayer = useAudioPlayer(starSounds[1]);
  const starThreePlayer = useAudioPlayer(starSounds[2]);
  const xpFillPlayer = useAudioPlayer(xpFillSound);
  const starIconShine = useIconShine(1050);
  const xpIconShine = useIconShine(350);
  const levelPoints = pointsAcquired + xpEarned;
  const progress =
    pointsRequired > 0
      ? Math.min(Math.max(levelPoints / pointsRequired, 0), 1)
      : levelPoints > 0
        ? 1
        : 0;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardOffset = useRef(new Animated.Value(24)).current;
  const detailsReveal = useRef(new Animated.Value(0)).current;
  const starScales = useRef(
    Array.from({ length: 3 }, () => new Animated.Value(0.35)),
  ).current;
  const progressFill = useRef(new Animated.Value(0)).current;
  const xpScale = useRef(new Animated.Value(0.65)).current;
  const exitOpacity = (start: number, end: number) => exitProgress?.interpolate({
    inputRange: [0, start, end, 1],
    outputRange: [1, 1, 0, 0],
    extrapolate: "clamp",
  }) ?? 1;

  useEffect(() => {
    if (preferencesLoaded && soundEnabled) {
      try {
        popPlayer.seekTo(0);
        popPlayer.play();
      } catch {
        // ignore
      }
    }

    const cardReveal = Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(cardOffset, {
        toValue: 0,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]);
    const detailsAnimation = Animated.timing(detailsReveal, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    });
    const starAnimation = Animated.stagger(
      140,
      starScales.map((scale, index) =>
        Animated.sequence([
          Animated.spring(scale, {
            toValue: index < starsEarned ? 1.2 : 0.78,
            friction: 4,
            tension: 150,
            useNativeDriver: true,
          }),
          ...(index < starsEarned
            ? [
                Animated.spring(scale, {
                  toValue: 1,
                  friction: 5,
                  tension: 120,
                  useNativeDriver: true,
                }),
              ]
            : []),
        ]),
      ),
    );
    const progressAnimation = Animated.timing(progressFill, {
      toValue: progress,
      duration: 650,
      useNativeDriver: false,
    });
    const xpNumberAnimation = Animated.sequence([
        Animated.spring(xpScale, {
          toValue: 1.15,
          friction: 4,
          tension: 150,
          useNativeDriver: true,
        }),
        Animated.spring(xpScale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
    ]);
    const starPlayers = [starOnePlayer, starTwoPlayer, starThreePlayer];
    const soundTimers: ReturnType<typeof setTimeout>[] = [];

    cardReveal.start(({ finished }) => {
      if (!finished) return;
      detailsAnimation.start(({ finished: detailsFinished }) => {
        if (!detailsFinished) return;

        starPlayers.forEach((player, index) => {
          soundTimers.push(setTimeout(() => {
            if (preferencesLoaded && soundEnabled) {
              try {
                player.seekTo(0);
                player.play();
              } catch {
                // ignore
              }
            }
          }, index * 140));
        });

        starAnimation.start(({ finished: starsFinished }) => {
          if (!starsFinished) return;
          if (progress > 0 && preferencesLoaded && soundEnabled) {
            try {
              xpFillPlayer.seekTo(0);
              xpFillPlayer.play();
            } catch {
              // ignore
            }
          }
          progressAnimation.start(({ finished: progressFinished }) => {
            if (!progressFinished) return;
            xpFillPlayer.pause();
            xpNumberAnimation.start();
          });
        });
      });
    });

    return () => {
      soundTimers.forEach(clearTimeout);
      cardReveal.stop();
      detailsAnimation.stop();
      starAnimation.stop();
      progressAnimation.stop();
      xpNumberAnimation.stop();
    };
  }, [cardOpacity, cardOffset, detailsReveal, starScales, progressFill, xpScale, progress, starsEarned, popPlayer, starOnePlayer, starTwoPlayer, starThreePlayer, xpFillPlayer, preferencesLoaded, soundEnabled]);

  return (
    <Animated.View
      style={[
        styles.overviewContainer,
        {
          opacity: Animated.multiply(cardOpacity, exitOpacity(0.78, 0.96)),
          transform: [{ translateY: cardOffset }],
        },
      ]}
    >
      <Animated.View style={{ opacity: exitOpacity(0.02, 0.18) }}>
        <AppText style={styles.overviewTitle}>Overview</AppText>
      </Animated.View>
      <Animated.View style={[styles.overviewRow, {
          opacity: Animated.multiply(detailsReveal, exitOpacity(0.08, 0.22)),
          transform: [{ translateY: detailsReveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }]}> 
        <AppText style={styles.overviewLabel} numberOfLines={1}>
          Duration:
        </AppText>
        <AppText style={styles.overviewValue}>{`${duration}s`}</AppText>
      </Animated.View>
      <Animated.View style={[styles.overviewRow, {
          opacity: Animated.multiply(detailsReveal, exitOpacity(0.18, 0.32)),
          transform: [{ translateY: detailsReveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }]}>
        <AppText style={styles.overviewLabel} numberOfLines={1}>
          Correct:
        </AppText>
        <AppText style={styles.overviewValue}>{correct}</AppText>
      </Animated.View>
      <Animated.View style={[styles.overviewRow, {
          opacity: Animated.multiply(detailsReveal, exitOpacity(0.28, 0.42)),
          transform: [{ translateY: detailsReveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }]}>
        <AppText style={styles.overviewLabel} numberOfLines={1}>
          Wrong:
        </AppText>
        <AppText style={styles.overviewValue}>{wrong}</AppText>
      </Animated.View>
      <Animated.View style={[styles.overviewRow, styles.rewardRow, {
          opacity: Animated.multiply(detailsReveal, exitOpacity(0.38, 0.52)),
          transform: [{ translateY: detailsReveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }]}>
        <View style={styles.rewardContent}>
          {Array.from({ length: 3 }, (_, index) => (
            <Animated.View
              key={index}
              style={{ transform: [{ scale: starScales[index] }] }}
            >
              <ShinyIcon
                source={require("../../../assets/star.png")}
                size={24}
                shine={starIconShine}
                imageStyle={index >= starsEarned && styles.unearnedStar}
              />
            </Animated.View>
          ))}
        </View>
      </Animated.View>
      <Animated.View style={[styles.overviewRow, styles.rewardRow, {
          opacity: Animated.multiply(detailsReveal, exitOpacity(0.48, 0.62)),
          transform: [{ translateY: detailsReveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }]}>
        <View style={styles.rewardContent}>
          <Animated.View
            style={{ transform: [{ scale: xpScale }] }}
          >
            <ShinyIcon
              source={require("../../../assets/lightning.png")}
              size={24}
              shine={xpIconShine}
            />
          </Animated.View>
          <Animated.Text style={[styles.overviewValue, { transform: [{ scale: xpScale }] }]}>{xpEarned}</Animated.Text>
        </View>
      </Animated.View>
      <Animated.View
        style={[styles.progressSection, {
          opacity: Animated.multiply(detailsReveal, exitOpacity(0.58, 0.76)),
          transform: [{ translateY: detailsReveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }]}
        accessibilityLabel={`Level progress ${levelPoints} of ${pointsRequired}`}
      >
        <View style={styles.progressHeader}>
          <AppText style={styles.progressLabel}>Level progress</AppText>
          <AppText style={styles.overviewValue}>{Math.round(progress * 100)}%</AppText>
        </View>
        <AppText style={styles.overviewValue}>
          {levelPoints} / {pointsRequired} XP
        </AppText>
        {attemptMessage ? (
          <View
            style={[
              styles.attemptCallout,
              attemptStatus === "passed" && styles.passedCallout,
              attemptStatus === "fresh-start" && styles.freshStartCallout,
            ]}
          >
            <AppText style={styles.attemptTitle}>
              {attemptStatus === "passed"
                ? "🌟 Level goal reached!"
                : attemptStatus === "second-attempt"
                  ? "🚀 One more round!"
                  : attemptStatus === "fresh-start"
                    ? "💪 Keep your courage!"
                    : "✨ Keep going!"}
            </AppText>
            <AppText style={styles.attemptMessage}>{attemptMessage}</AppText>
          </View>
        ) : null}
        <View style={styles.tubeTrack}>
          <Animated.View
            style={[
              styles.tubeFill,
              {
                width: progressFill.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
                backgroundColor: progressFill.interpolate({
                  inputRange: [0, 0.25, 0.5, 0.75, 1],
                  outputRange: ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"],
                  extrapolate: "clamp",
                }),
              },
            ]}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overviewContainer: {
    position: "relative",
    width: "90%",
    maxWidth: 420,
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 3,
    borderColor: "#f3d789",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  rewardRow: {
    overflow: "visible",
  },
  overviewTitle: {
    fontFamily: "FredokaBold",
    fontSize: 26,
    color: "#503617",
    marginBottom: 14,
    textAlign: "center",
  },
  overviewRow: {
    width: "80%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 5,
    borderRadius: 14,
    backgroundColor: "#fff4d7",
    borderWidth: 2,
    borderColor: "#e6b95b",
  },
  overviewLabel: {
    color: "#4b2d00",
    flexShrink: 1,
    fontSize: 15,
    fontFamily: "FredokaBold",
  },
  overviewValue: {
    color: "#4b2d00",
    fontSize: 15,
    fontFamily: "FredokaBold",
  },
  rewardContent: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  unearnedStar: {
    tintColor: "#c8c8c8",
    opacity: 0.55,
  },
  progressSection: {
    width: "80%",
    marginTop: 4,
    marginBottom: 4,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: {
    color: "#4b2d00",
    fontSize: 13,
    fontFamily: "FredokaBold",
  },
  attemptCallout: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 7,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#f2a900",
    backgroundColor: "#fff4cc",
  },
  passedCallout: {
    backgroundColor: "#e3ffeb",
    borderColor: "#42bf72",
  },
  freshStartCallout: {
    backgroundColor: "#e9f4ff",
    borderColor: "#55a7e8",
  },
  attemptTitle: {
    color: "#684619",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "FredokaBold",
    textAlign: "center",
  },
  attemptMessage: {
    color: "#684619",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "FredokaMedium",
    textAlign: "center",
    marginTop: 3,
  },
  tubeTrack: {
    height: 18,
    width: "100%",
    padding: 3,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#e6c98a",
    borderWidth: 1,
    borderColor: "#c99535",
  },
  tubeFill: {
    height: "100%",
    minWidth: 0,
    borderRadius: 999,
    backgroundColor: "#ef4444",
  },
});
