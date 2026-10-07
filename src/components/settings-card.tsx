import AppText from "./app-text";
import { useAudioPlayer } from "expo-audio";
import { useFonts } from "expo-font";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import LetterPanel from "./letter-panel";
import type { KidoLanguage } from "../lib/language-preferences";

const popSound = require("../assets/sound.effects/pop.mp3");

type SettingsCardProps = {
  visible: boolean;
  onClose: () => void;
  theme?: "day" | "dark";
  onThemeChange?: (nextTheme: "day" | "dark") => void;
  soundEnabled: boolean;
  musicEnabled: boolean;
  onSoundChange: (enabled: boolean) => void;
  onMusicChange: (enabled: boolean) => void;
  language: KidoLanguage;
  onLanguageChange: (language: KidoLanguage) => void;
};

type ToggleProps = {
  enabled: boolean;
  activeColor: string;
  inactiveColor: string;
  onToggle: () => void;
};

function SettingToggle({
  enabled,
  activeColor,
  inactiveColor,
  onToggle,
}: ToggleProps) {
  const position = useRef(new Animated.Value(enabled ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(position, {
      toValue: enabled ? 1 : 0,
      friction: 6,
      tension: 150,
      useNativeDriver: true,
    }).start();
  }, [enabled, position]);

  const thumbTranslate = position.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 34],
  });

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onToggle}
      style={styles.lottieToggle}
    >
      <Animated.View
        style={[
          styles.webToggle,
          {
            backgroundColor: enabled ? activeColor : inactiveColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.webToggleThumb,
            {
              transform: [{ translateX: thumbTranslate }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function SettingsCard({
  visible,
  onClose,
  theme: externalTheme,
  onThemeChange,
  soundEnabled,
  musicEnabled,
  onSoundChange,
  onMusicChange,
  language,
  onLanguageChange,
}: SettingsCardProps) {
  const isWeb = Platform.OS === "web";
  const slideY = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const popPlayer = useAudioPlayer(popSound);
  const [playerName, setPlayerName] = useState("Ava");
  const [fontsLoaded] = useFonts({
    FredokaRegular: require("../assets/fonts/Fredoka-Regular.ttf"),
    FredokaMedium: require("../assets/fonts/Fredoka-Medium.ttf"),
    FredokaBold: require("../assets/fonts/Fredoka-Bold.ttf"),
  });
  const [internalTheme, setInternalTheme] = useState<"day" | "dark">("day");
  const theme = externalTheme ?? internalTheme;

  const playPopSound = () => {
    if (!soundEnabled) {
      return;
    }

    try {
      popPlayer.seekTo(0);
      popPlayer.play();
    } catch {
      // Ignore transient audio playback issues while the component is mounting.
    }
  };

  const handleThemeChange = (nextTheme: "day" | "dark") => {
    playPopSound();
    if (onThemeChange) {
      onThemeChange(nextTheme);
      return;
    }

    setInternalTheme(nextTheme);
  };

  const themeColors =
    theme === "dark"
      ? {
          cardBg: "#1f2937",
          titleColor: "#f8fafc",
          textColor: "#e2e8f0",
          mutedColor: "#cbd5e1",
          borderColor: "rgba(148, 163, 184, 0.2)",
          backdrop: "rgba(2, 6, 23, 0.56)",
          toggleBg: "#374151",
          toggleActive: "#fbbf24",
          toggleInactive: "#94a3b8",
        }
      : {
          cardBg: "#fff8ed",
          titleColor: "#3a2c1f",
          textColor: "#4a2d12",
          mutedColor: "#6b4a28",
          borderColor: "rgba(122, 82, 36, 0.1)",
          backdrop: "rgba(15, 23, 42, 0.38)",
          toggleBg: "#e5d5b9",
          toggleActive: "#f59e0b",
          toggleInactive: "#bca57e",
        };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(slideY, {
          toValue: 0,
          friction: 7,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: 300,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, slideY]);

  if (!visible) {
    return null;
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.overlay, { opacity }]}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: themeColors.backdrop }]}
        onPress={onClose}
      />

      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateY: slideY }],
            backgroundColor: "transparent",
            borderColor: "transparent",
          },
        ]}
      >
        <LetterPanel open={visible} darkMode={theme === "dark"}>
          <View style={styles.headerRow}>
            <AppText style={[styles.title, { color: themeColors.titleColor }]}>
              Settings
            </AppText>
            <Pressable
              style={styles.closeButton}
              onPress={() => {
                playPopSound();
                onClose();
              }}
            >
              <AppText
                style={[styles.closeText, { color: themeColors.titleColor }]}
              >
                ×
              </AppText>
            </Pressable>
          </View>

          <View style={[styles.languageRow, { borderBottomColor: themeColors.borderColor }]}>
            <AppText
              style={[styles.optionLabel, { color: themeColors.textColor }]}
            >
              {language === "SW" ? "Lugha" : "Language"}
            </AppText>
            <View style={styles.languageChoices}>
              {(["EN", "SW"] as const).map((choice) => (
                <Pressable
                  key={choice}
                  accessibilityRole="button"
                  accessibilityState={{ selected: language === choice }}
                  onPress={() => {
                    playPopSound();
                    onLanguageChange(choice);
                  }}
                  style={[
                    styles.languageChoice,
                    { borderColor: themeColors.borderColor },
                    language === choice && { backgroundColor: themeColors.toggleActive, borderColor: themeColors.toggleActive },
                  ]}
                >
                  <AppText style={[styles.languageChoiceText, { color: language === choice ? "#3a2c1f" : themeColors.textColor }]}>
                    {choice === "EN" ? "English" : "Kiswahili"}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.optionRow}>
            <AppText
              style={[styles.optionLabel, { color: themeColors.textColor }]}
            >
              Theme
            </AppText>

            <SettingToggle
              enabled={theme === "dark"}
              activeColor={themeColors.toggleActive}
              inactiveColor={themeColors.toggleInactive}
              onToggle={() =>
                handleThemeChange(theme === "day" ? "dark" : "day")
              }
            />
          </View>

          <View
            style={[
              styles.optionRow,
              { borderBottomColor: themeColors.borderColor },
            ]}
          >
            <AppText
              style={[styles.optionLabel, { color: themeColors.textColor }]}
            >
              Sound
            </AppText>
            <SettingToggle
              enabled={soundEnabled}
              activeColor={themeColors.toggleActive}
              inactiveColor={themeColors.toggleInactive}
              onToggle={() => {
                playPopSound();
                onSoundChange(!soundEnabled);
              }}
            />
          </View>

          <View
            style={[
              styles.optionRow,
              { borderBottomColor: themeColors.borderColor },
            ]}
          >
            <AppText
              style={[styles.optionLabel, { color: themeColors.textColor }]}
            >
              Music
            </AppText>
            <SettingToggle
              enabled={musicEnabled}
              activeColor={themeColors.toggleActive}
              inactiveColor={themeColors.toggleInactive}
              onToggle={() => {
                playPopSound();
                onMusicChange(!musicEnabled);
              }}
            />
          </View>

        </LetterPanel>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(53, 23, 23, 0.38)",
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: 500,
    padding: 0,
    elevation: 12,
    zIndex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontFamily: "FredokaBold",
    fontSize: 18,
    color: "#3a2c1f",
  },
  sectionTitleWrap: {
    marginBottom: 8,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f3d7aa",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontFamily: "FredokaBold",
    fontSize: 21,
    lineHeight: 21,
    color: "#4a2d12",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(122, 82, 36, 0.1)",
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  languageChoices: {
    flexDirection: "row",
    gap: 6,
  },
  languageChoice: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  languageChoiceText: {
    fontFamily: "FredokaMedium",
    fontSize: 10,
  },
  optionLabel: {
    fontFamily: "FredokaMedium",
    fontSize: 12,
    color: "#4a2d12",
    flexShrink: 1,
  },
  optionValue: {
    fontFamily: "FredokaRegular",
    fontSize: 11,
    color: "#6b4a28",
  },
  lottieToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  webToggle: {
    width: 60,
    height: 27,
    borderRadius: 14,
    padding: 3,
    justifyContent: "center",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  webToggleThumb: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  lottieSwitch: {
    width: 110,
    height: 42,
  },
  themeValue: {
    fontSize: 12,
    fontWeight: "700",
  },
});
