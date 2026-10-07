import AppText from "../../app-text";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { getGradeSubjectLevels } from "../../../lib/api";
import { getUserLevelProgress } from "../../../lib/api";

type LevelsProps = {
  levels?: Array<number | string>;
  gradeSubjectId?: string | number | null;
  currentLevel?: number;
  onSelectLevel?: (
    level: {
      id: string | number;
      levelNumber: number;
      pointsRequired?: number;
      timeLimit?: number;
      pointsAcquired?: number;
    },
    index: number,
  ) => void;
  onStart?: () => void;
  isWeb?: boolean;
  style?: StyleProp<ViewStyle>;
};

type LevelOption = {
  id: string | number;
  levelNumber: number;
  pointsRequired?: number;
  timeLimit?: number;
  pointsAcquired?: number;
  unlocked?: boolean;
};

export default function Levels({
  levels = [1, 2, 3, 4, 5],
  gradeSubjectId,
  currentLevel = 1,
  onSelectLevel,
  onStart,
  isWeb = false,
  style,
}: LevelsProps) {
  const fallbackLevels: LevelOption[] = levels.map((level, index) => ({
    id: String(level),
    levelNumber: Number(level) || index + 1,
  }));
  const [loadedLevels, setLoadedLevels] = useState<LevelOption[]>(fallbackLevels);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<LevelOption | null>(null);

  useEffect(() => {
    if (gradeSubjectId === undefined || gradeSubjectId === null) {
      const lockedFallbackLevels = fallbackLevels.map((level, index) => ({ ...level, unlocked: index === 0 }));
      const initialLevel = lockedFallbackLevels[0] ?? null;
      setLoadedLevels(lockedFallbackLevels);
      setSelectedLevel(initialLevel);
      return;
    }

    let cancelled = false;

    const loadLevels = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getGradeSubjectLevels(gradeSubjectId);
        const items = Array.isArray(response)
          ? response
          : Array.isArray(response?.levels)
            ? response.levels
            : Array.isArray(response?.gameLevels)
              ? response.gameLevels
            : Array.isArray(response?.data)
              ? response.data
              : [];
        const nextLevels: LevelOption[] = items.map((item: any, index: number) => ({
          id: item?.id ?? item?.levelId ?? String(item?.levelNumber ?? index + 1),
          levelNumber: Number(item?.levelNumber ?? item?.number ?? item?.name ?? item),
          pointsRequired: Number(item?.requiredPoints ?? item?.pointsRequired ?? 0),
          timeLimit: Number(item?.timeLimit ?? item?.time ?? 0),
          pointsAcquired: Number(item?.pointsAcquired ?? item?.earnedPoints ?? item?.bestScore ?? 0),
        })).filter((level: { levelNumber: number }) => Number.isFinite(level.levelNumber))
          .sort((left: LevelOption, right: LevelOption) => left.levelNumber - right.levelNumber);

        let progressRecords: any[] = [];
        try {
          const token = await AsyncStorage.getItem("kido.authToken");
          if (token) {
            const progressResponse: any = await getUserLevelProgress(token);
            const records = Array.isArray(progressResponse)
              ? progressResponse
              : progressResponse?.progress ??
                progressResponse?.progresses ??
                progressResponse?.data?.progress ??
                progressResponse?.data?.progresses ??
                progressResponse?.data ??
                [];
            progressRecords = Array.isArray(records) ? records : [];
          }
        } catch {
          // If progress cannot load, keep only the first level available.
        }

        const unlockedLevels = nextLevels.map((level, index) => {
          const progress = progressRecords.find(
            (record) => String(record?.gameLevelId ?? record?.levelId) === String(level.id),
          );
          const pointsAcquired = Number(
            progress?.bestScore ?? progress?.score ?? progress?.px ?? level.pointsAcquired ?? 0,
          ) + Number(progress?.pendingXp ?? 0);
          const previousLevel = nextLevels[index - 1];
          const previousProgress = previousLevel
            ? progressRecords.find(
                (record) => String(record?.gameLevelId ?? record?.levelId) === String(previousLevel.id),
              )
            : null;
          return {
            ...level,
            pointsAcquired,
            unlocked: index === 0 || previousProgress?.completed === true,
          };
        });

        if (!cancelled) {
          const availableLevels = unlockedLevels.length > 0
            ? unlockedLevels
            : fallbackLevels.map((level, index) => ({ ...level, unlocked: index === 0 }));
          setLoadedLevels(availableLevels);
          setSelectedLevel(
            [...availableLevels].reverse().find((level) => level.unlocked) ?? null,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load levels.",
          );
          const lockedFallbackLevels = fallbackLevels.map((level, index) => ({ ...level, unlocked: index === 0 }));
          setLoadedLevels(lockedFallbackLevels);
          const initialLevel = lockedFallbackLevels[0] ?? null;
          setSelectedLevel(initialLevel);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadLevels();

    return () => {
      cancelled = true;
    };
  }, [gradeSubjectId]);

  useEffect(() => {
    if (!selectedLevel) return;
    const selectedIndex = loadedLevels.findIndex((level) => level.id === selectedLevel.id);
    if (selectedIndex >= 0 && selectedLevel.unlocked !== false) onSelectLevel?.(selectedLevel, selectedIndex);
  }, [selectedLevel, loadedLevels, onSelectLevel]);

  const safeCurrentLevel = Math.min(
    Math.max(currentLevel, 1),
    loadedLevels.length || 1,
  );
  const selectedLevelValue =
    selectedLevel ?? loadedLevels[safeCurrentLevel - 1] ?? loadedLevels[0] ?? null;

  return (
    <View style={[styles.overlay, isWeb && styles.webOverlay, style]}>
      <View style={styles.card}>
        <AppText style={styles.title}>Select a level</AppText>
        <AppText style={styles.statusText}>Earn the required XP to unlock the next level.</AppText>
        {isLoading && <AppText style={styles.statusText}>Loading levels...</AppText>}
        {errorMessage && <AppText style={styles.errorText}>{errorMessage}</AppText>}
        <View style={styles.grid}>
          {loadedLevels.map((level, index) => {
            const isActive = selectedLevelValue !== null && level.id === selectedLevelValue.id;

            return (
              <Pressable
                key={`${level}-${index}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: level.unlocked === false }}
                disabled={level.unlocked === false}
                onPress={() => {
                  setSelectedLevel(level);
                  onSelectLevel?.(level, index);
                }}
                style={({ pressed }) => [
                  styles.levelButton,
                  isWeb && styles.webLevelButton,
                  isActive && styles.activeLevelButton,
                  pressed && styles.pressedLevelButton,
                  level.unlocked === false && styles.lockedLevelButton,
                ]}
              >
                <AppText
                  style={[
                    styles.levelText,
                    isActive && styles.activeLevelText,
                  ]}
                >
                  {level.levelNumber}
                </AppText>
                {level.unlocked === false ? <AppText style={styles.lockIcon}>🔒</AppText> : null}
              </Pressable>
            );
          })}
        </View>

          {selectedLevelValue !== null && selectedLevelValue.unlocked !== false && (
          <Pressable
            accessibilityRole="button"
            onPress={onStart}
            style={styles.startButton}
          >
            <AppText style={styles.startButtonText}>Select</AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    inset: 0,
    zIndex: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20, 26, 42, 0.28)",
    paddingHorizontal: 24,
  },
  webOverlay: {
    paddingHorizontal: 40,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 3,
    borderColor: "#f3d789",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    alignItems: "center",
  },
  title: {
    fontFamily: "FredokaBold",
    fontSize: 30,
    color: "#503617",
    marginBottom: 22,
    textAlign: "center",
  },
  statusText: {
    color: "#5a3b1c",
    fontFamily: "FredokaBold",
    fontSize: 14,
    marginBottom: 12,
  },
  errorText: {
    color: "#9b1c1c",
    fontFamily: "FredokaBold",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
  },
  levelButton: {
    width: 78,
    height: 78,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff4d7",
    borderWidth: 3,
    borderColor: "#e6b95b",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  webLevelButton: {
    width: 84,
    height: 84,
  },
  activeLevelButton: {
    backgroundColor: "#f7b539",
    borderColor: "#fff5d1",
    transform: [{ scale: 1.04 }],
  },
  pressedLevelButton: {
    opacity: 0.9,
  },
  lockedLevelButton: { opacity: 0.45 },
  lockIcon: { position: "absolute", bottom: 3, fontSize: 13 },
  levelText: {
    color: "#4b2d00",
    fontSize: 26,
    fontFamily: "FredokaBold",
    textAlign: "center",
  },
  activeLevelText: {
    color: "#4b2d00",
  },
  startButton: {
    marginTop: 20,
    backgroundColor: "#ffb703",
    borderRadius: 18,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#fff6d6",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  startButtonText: {
    color: "#fff",
    fontFamily: "FredokaBold",
    fontSize: 20,
    letterSpacing: 0.5,
  },
});
