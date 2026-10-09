import { useAudioPlayer } from "expo-audio";
import { useCallback, useEffect } from "react";
import { useAudioPreferences } from "./audio-preferences";

const pressSound = require("../assets/sound.effects/pop.mp3");

export function usePracticePressSound() {
  const player = useAudioPlayer(pressSound);
  const { soundEnabled, preferencesLoaded } = useAudioPreferences();

  const playPressSound = useCallback(() => {
    if (!preferencesLoaded || !soundEnabled) return;
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Ignore transient audio playback errors so button actions still work.
    }
  }, [player, preferencesLoaded, soundEnabled]);

  useEffect(() => {
    if (preferencesLoaded && soundEnabled) return;
    try {
      player.pause();
    } catch {
      // Ignore transient audio playback errors while preferences load or change.
    }
  }, [player, preferencesLoaded, soundEnabled]);

  return playPressSound;
}
