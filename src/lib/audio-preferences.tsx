import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

const SOUND_KEY = "kido.soundEnabled";
const MUSIC_KEY = "kido.musicEnabled";

interface AudioPreferences {
  soundEnabled: boolean;
  musicEnabled: boolean;
  preferencesLoaded: boolean;
  setSoundEnabled: (value: boolean) => void;
  setMusicEnabled: (value: boolean) => void;
}

type AudioPreferencesSnapshot = Pick<
  AudioPreferences,
  "soundEnabled" | "musicEnabled" | "preferencesLoaded"
>;

let snapshot: AudioPreferencesSnapshot = {
  soundEnabled: true,
  musicEnabled: true,
  preferencesLoaded: false,
};
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;
let soundRevision = 0;
let musicRevision = 0;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => snapshot;

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

const loadPreferences = () => {
  if (loadPromise) return loadPromise;

  const initialSoundRevision = soundRevision;
  const initialMusicRevision = musicRevision;
  loadPromise = AsyncStorage.multiGet([SOUND_KEY, MUSIC_KEY])
    .then(([sound, music]) => {
      snapshot = {
        soundEnabled:
          soundRevision === initialSoundRevision
            ? sound[1] !== "false"
            : snapshot.soundEnabled,
        musicEnabled:
          musicRevision === initialMusicRevision
            ? music[1] !== "false"
            : snapshot.musicEnabled,
        preferencesLoaded: true,
      };
      notifyListeners();
    })
    .catch(() => {
      snapshot = { ...snapshot, preferencesLoaded: true };
      notifyListeners();
    });

  return loadPromise;
};

const updatePreference = async (
  key: typeof SOUND_KEY | typeof MUSIC_KEY,
  value: boolean,
) => {
  if (key === SOUND_KEY) {
    soundRevision += 1;
    snapshot = { ...snapshot, soundEnabled: value };
  } else {
    musicRevision += 1;
    snapshot = { ...snapshot, musicEnabled: value };
  }
  notifyListeners();

  try {
    await AsyncStorage.setItem(key, String(value));
  } catch {
    // Keep the in-memory setting active when storage is unavailable.
  }
};

const setSoundEnabled = (value: boolean) =>
  updatePreference(SOUND_KEY, value);
const setMusicEnabled = (value: boolean) =>
  updatePreference(MUSIC_KEY, value);

export function useAudioPreferences(): AudioPreferences {
  const preferences = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  useEffect(() => {
    void loadPreferences();
  }, []);

  return {
    ...preferences,
    setSoundEnabled,
    setMusicEnabled,
  };
}
