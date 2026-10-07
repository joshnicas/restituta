import AppText from "../../app-text";
import { useState } from "react";
import type { ImageSourcePropType } from "react-native";
import {
    Dimensions,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import { useAudioPreferences } from "../../../lib/audio-preferences";
import ShinyIcon, { useIconShine } from "./shiny-icon";

type PreferenceSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function PreferenceSwitch({ value, onValueChange }: PreferenceSwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      style={[
        styles.preferenceSwitch,
        value && styles.preferenceSwitchEnabled,
      ]}
    >
      <View
        style={[
          styles.preferenceSwitchThumb,
          value && styles.preferenceSwitchThumbEnabled,
        ]}
      />
    </Pressable>
  );
}

type TopRightBarProps = {
  xp?: number;
  stars?: number;
  onSettingsPress?: () => void;
  settingsIconSource?: ImageSourcePropType;
  coinBoardSource?: ImageSourcePropType;
};

export default function TopRightBar({
  xp = 0,
  stars = 0,
  onSettingsPress,
  settingsIconSource = require("../../../assets/lands/kilimanjaro/settings.png"),
  coinBoardSource = require("../../../assets/lands/kilimanjaro/coin-board.png"),
}: TopRightBarProps) {
  const isCompactPhone =
    Platform.OS !== "web" && Dimensions.get("window").width < 390;
  const { width } = useWindowDimensions();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const xpIconShine = useIconShine(350);
  const starIconShine = useIconShine(1050);
  const {
    soundEnabled,
    musicEnabled,
    setSoundEnabled,
    setMusicEnabled,
  } = useAudioPreferences();

  const handleSettingsPress = () => {
    setSettingsVisible((visible) => !visible);
    onSettingsPress?.();
  };

  return (
    <View style={styles.container}>
      <View
        style={[styles.metricBox, isCompactPhone && styles.mobileMetricBox]}
      >
        <Image
          source={coinBoardSource}
          style={styles.metricBackground}
          resizeMode="stretch"
        />
        <View style={styles.metricContent}>
          <ShinyIcon
            source={require("../../../assets/lightning.png")}
            size={isCompactPhone ? 20 : 30}
            shine={xpIconShine}
            style={[
              styles.metricIcon,
              isCompactPhone && styles.mobileMetricIcon,
            ]}
          />
          <AppText
            style={[
              styles.metricText,
              isCompactPhone && styles.mobileMetricText,
            ]}
          >
            {xp}
          </AppText>
        </View>
      </View>

      <View
        style={[styles.metricBox, isCompactPhone && styles.mobileMetricBox]}
      >
        <Image
          source={coinBoardSource}
          style={styles.metricBackground}
          resizeMode="stretch"
        />
        <View style={styles.metricContent}>
          <ShinyIcon
            source={require("../../../assets/star.png")}
            size={isCompactPhone ? 20 : 30}
            shine={starIconShine}
            style={[
              styles.metricIcon,
              isCompactPhone && styles.mobileMetricIcon,
            ]}
          />
          <AppText
            style={[
              styles.metricText,
              isCompactPhone && styles.mobileMetricText,
            ]}
          >
            {stars}
          </AppText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={handleSettingsPress}
        style={[
          styles.settingsButton,
          isCompactPhone && styles.mobileSettingsButton,
        ]}
      >
        <Image
          source={settingsIconSource}
          style={[
            styles.settingsIcon,
            isCompactPhone && styles.mobileSettingsIcon,
          ]}
          resizeMode="contain"
        />
      </Pressable>

      {settingsVisible && (
        <View
          style={[
            styles.settingsPopover,
            isCompactPhone && styles.mobileSettingsPopover,
            width < 360 && styles.narrowSettingsPopover,
          ]}
        >
          <View style={styles.popoverHeader}>
            <AppText style={styles.popoverTitle}>Settings</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close settings"
              onPress={() => setSettingsVisible(false)}
              style={styles.closeButton}
            >
              <AppText style={styles.closeText}>×</AppText>
            </Pressable>
          </View>
          <View style={styles.settingRow}>
            <AppText style={styles.settingLabel}>Sound</AppText>
            <PreferenceSwitch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
            />
          </View>
          <View style={styles.settingRow}>
            <AppText style={styles.settingLabel}>Music</AppText>
            <PreferenceSwitch
              value={musicEnabled}
              onValueChange={setMusicEnabled}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 120,
    elevation: 120,
  },
  settingsButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  mobileSettingsButton: {
    width: 28,
    height: 28,
  },
  settingsIcon: {
    width: 60,
    height: 60,
  },
  mobileSettingsIcon: {
    width: 54,
    height: 54,
  },
  settingsPopover: {
    position: "absolute",
    top: 54,
    right: 0,
    width: 190,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#fff8ed",
    borderWidth: 3,
    borderColor: "#f4b942",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 121,
    zIndex: 121,
  },
  mobileSettingsPopover: {
    top: 38,
    width: 170,
    padding: 10,
  },
  narrowSettingsPopover: {
    right: -8,
  },
  popoverHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  popoverTitle: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 17,
  },
  closeButton: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#503617",
    fontSize: 24,
    lineHeight: 24,
  },
  settingRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(122, 82, 36, 0.14)",
  },
  settingLabel: {
    color: "#4a2d12",
    fontFamily: "FredokaMedium",
    fontSize: 14,
  },
  preferenceSwitch: {
    width: 46,
    height: 28,
    padding: 3,
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#bca57e",
  },
  preferenceSwitchEnabled: {
    backgroundColor: "#f4b942",
  },
  preferenceSwitchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff8ed",
  },
  preferenceSwitchThumbEnabled: {
    alignSelf: "flex-end",
  },
  metricBox: {
    position: "relative",
    width: 145,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileMetricBox: {
    width: 90,
    height: 58,
  },
  metricBackground: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  metricContent: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  metricIcon: {
    position: "absolute",
    left: 22,
    top: "50%",
    marginTop: -15,
    width: 30,
    height: 30,
  },
  mobileMetricIcon: {
    left: 12,
    marginTop: -10,
    width: 20,
    height: 20,
  },
  heartIcon: {
    position: "absolute",
    left: 22,
    top: "50%",
    marginTop: -14,
    width: 28,
    height: 28,
  },
  metricText: {
    position: "absolute",
    left: 70,
    right: 8,
    top: "50%",
    marginTop: -9,
    fontFamily: "FredokaBold",
    fontSize: 18,
    color: "#fff",
    lineHeight: 18,
    textAlign: "left",
    includeFontPadding: false,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mobileMetricText: {
    left: 40,
    fontSize: 13,
    lineHeight: 13,
  },
  mobileHeartIcon: {
    left: 13,
    marginTop: -10,
    width: 20,
    height: 20,
  },
});
