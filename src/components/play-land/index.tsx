import AppText from "../app-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayer } from "expo-audio";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useAudioPreferences } from "../../lib/audio-preferences";
import Kilimanjaro from "./kilimanjaro";
import Mwanza from "./mwanza";

const LAND_KEY = "kido.selectedLand";
const playLandMusic = require("../../assets/sound.effects/music2.mp3");

export default function PlayLand() {
  const musicPlayer = useAudioPlayer(playLandMusic);
  const { musicEnabled, preferencesLoaded } = useAudioPreferences();
  const [landKey, setLandKey] = useState<string | null>(null);
  const [roundStarted, setRoundStarted] = useState(false);
  const [overviewVisible, setOverviewVisible] = useState(false);

  useEffect(() => {
    if (!preferencesLoaded || !musicEnabled || !roundStarted || overviewVisible) {
      musicPlayer.pause();
      return;
    }

    musicPlayer.loop = true;
    musicPlayer.volume = 0.4;
    musicPlayer.play();
  }, [musicEnabled, musicPlayer, overviewVisible, preferencesLoaded, roundStarted]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const v = await AsyncStorage.getItem(LAND_KEY);
        if (!mounted) return;
        const supportedLand = v === "mwanza" ? "mwanza" : "kilimanjaro";
        setLandKey(supportedLand);
        if (v !== supportedLand) await AsyncStorage.setItem(LAND_KEY, supportedLand);
      } catch {
        if (mounted) setLandKey("kilimanjaro");
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  if (!landKey) {
    return (
      <View style={styles.center}>
        <AppText style={styles.text}>Loading…</AppText>
      </View>
    );
  }

  switch (landKey) {
    case "kilimanjaro":
      return (
        <Kilimanjaro
          onOverviewVisibilityChange={setOverviewVisible}
          onRoundStart={setRoundStarted}
        />
      );
    case "mwanza":
      return (
        <Mwanza
          onOverviewVisibilityChange={setOverviewVisible}
          onRoundStart={setRoundStarted}
        />
      );
    default:
      return (
        <Kilimanjaro
          onOverviewVisibilityChange={setOverviewVisible}
          onRoundStart={setRoundStarted}
        />
      );
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 16, color: "#333" },
});
