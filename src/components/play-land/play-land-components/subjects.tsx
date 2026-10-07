import AppText from "../../app-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
    Pressable,
    StyleSheet,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import {
  getGradeSubjectLevels,
  getGradeSubjects,
  getUserLevelProgress,
  getUserMe,
} from "../../../lib/api";
import { getPlayLandErrorMessage, isNetworkError, NO_INTERNET_MESSAGE } from "../../../lib/network-errors";

export type CurrentLevel = {
  id: string | number;
  gradeSubjectId: string | number;
  levelNumber: number;
  pointsRequired: number;
  timeLimit: number;
  pointsAcquired: number;
};

const fromSubjectNames = (names: string[]): SubjectOption[] =>
  names.map((name) => ({ name, currentLevel: null }));

type SubjectsProps = {
  subjects?: string[];
  gradeId?: string | number | null;
  onSelectSubject?: (
    subject: string,
    index: number,
    gradeSubjectId?: string | number,
    currentLevel?: CurrentLevel,
  ) => void;
  isWeb?: boolean;
  style?: StyleProp<ViewStyle>;
};

const getUserPayload = (response: any) =>
  response?.user ?? response?.data?.user ?? response?.data ?? response;

type SubjectListItem = {
  id?: string | number;
  gradeSubjectId?: string | number;
  name?: string;
  title?: string;
  subjectName?: string;
  subject?: { name?: string; title?: string } | null;
  Subject?: { name?: string; title?: string } | null;
  subjectDetails?: { name?: string; title?: string } | null;
};

type SubjectOption = {
  id?: string | number;
  name: string;
  currentLevel: CurrentLevel | null;
};

const normalizeSubjectOptions = (payload: unknown): SubjectOption[] => {
  const maybeItems =
    Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { subjects?: unknown })?.subjects)
        ? (payload as { subjects: unknown[] }).subjects
        : Array.isArray((payload as { data?: unknown })?.data)
          ? (payload as { data: unknown[] }).data
          : Array.isArray((payload as { gradeSubjects?: unknown })?.gradeSubjects)
            ? (payload as { gradeSubjects: unknown[] }).gradeSubjects
            : [];

  const options: Array<SubjectOption | null> = maybeItems
    .map((item: unknown) => {
      const record = item as SubjectListItem | null;
      const subject =
        record?.subject ?? record?.Subject ?? record?.subjectDetails ?? null;
      const subjectName =
        record?.name ??
        subject?.name ??
        record?.subjectName ??
        subject?.title ??
        record?.title ??
        null;

      if (typeof subjectName === "string" && subjectName.trim()) {
        return {
          id: record?.gradeSubjectId ?? record?.id,
          name: subjectName.trim(),
          currentLevel: null,
        };
      }

      return null;
    });

  return options.filter((value) => value !== null);
};

export default function Subjects({
  subjects = [],
  gradeId,
  onSelectSubject,
  isWeb = false,
  style,
}: SubjectsProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loadedSubjects, setLoadedSubjects] = useState<SubjectOption[]>(
    (subjects ?? []).map((name) => ({ name, currentLevel: null })),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [resolvedGradeId, setResolvedGradeId] = useState<string | number | null>(
    gradeId ?? null,
  );
  const lastFetchedGrade = useRef<string | null>(null);
  const loadCurrentLevelsRef = useRef<(
    items: SubjectOption[],
    isCancelled: () => boolean,
  ) => Promise<void>>(async () => {});

  useEffect(() => {
    let cancelled = false;

    const resolveCurrentGrade = async () => {
      if (gradeId !== undefined && gradeId !== null) {
        if (!cancelled) setResolvedGradeId(gradeId);
        return;
      }

      try {
        const token = await AsyncStorage.getItem("kido.authToken");
        if (!token) {
          if (!cancelled) {
            setResolvedGradeId(null);
            setLoadedSubjects(fromSubjectNames(subjects ?? []));
            setErrorMessage("Your grade is unavailable. Sign in and try again.");
          }
          return;
        }

        const user = getUserPayload(await getUserMe(token));
        const nextGradeId = user?.gradeId ?? user?.grade?.id ?? null;

        if (!cancelled) {
          setResolvedGradeId(nextGradeId);
        }
      } catch (error) {
        if (!cancelled) {
          setResolvedGradeId(null);
          setLoadedSubjects(fromSubjectNames(subjects ?? []));
          setErrorMessage(isNetworkError(error) ? NO_INTERNET_MESSAGE : "Couldn't load your grade. Please try again.");
        }
      }
    };

    void resolveCurrentGrade();

    return () => {
      cancelled = true;
    };
  }, [gradeId, reloadKey]);

  useEffect(() => {
    if (resolvedGradeId === null || resolvedGradeId === undefined) {
      setLoadedSubjects(fromSubjectNames(subjects ?? []));
      return;
    }

    const gradeKey = String(resolvedGradeId);
    if (lastFetchedGrade.current === gradeKey) {
      return;
    }

    lastFetchedGrade.current = gradeKey;

    let cancelled = false;

    const loadSubjects = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getGradeSubjects(resolvedGradeId);
        const nextSubjects = normalizeSubjectOptions(response);
        const subjectOptions = nextSubjects;

        if (!cancelled) {
          setLoadedSubjects(subjectOptions);
          if (subjectOptions.length > 0) {
            void loadCurrentLevelsRef.current(subjectOptions, () => cancelled);
          } else {
            setErrorMessage("No subjects are available for your grade yet.");
          }
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getPlayLandErrorMessage(error, "Couldn't load subjects. Please try again."));
          setLoadedSubjects([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSubjects();

    return () => {
      cancelled = true;
    };
  }, [resolvedGradeId, reloadKey]);

  const displaySubjects = loadedSubjects;

  const loadCurrentLevels = async (
    items: SubjectOption[],
    isCancelled: () => boolean,
  ) => {
    setIsLoadingLevels(true);
    try {
      let progressRecords: any[] = [];
      let networkUnavailable = false;
      try {
        const token = await AsyncStorage.getItem("kido.authToken");
        if (token) {
          const response: any = await getUserLevelProgress(token);
          const records = Array.isArray(response)
            ? response
            : response?.progress ??
              response?.progresses ??
              response?.data?.progress ??
              response?.data?.progresses ??
              response?.data ??
              [];
          progressRecords = Array.isArray(records) ? records : [];
        }
      } catch (error) {
        networkUnavailable = isNetworkError(error);
        // If progress is unavailable, use the first level as a safe fallback.
      }

      const subjectsWithLevels = await Promise.all(items.map(async (subject) => {
        if (subject.id === undefined || subject.id === null) return subject;
        try {
          const response: any = await getGradeSubjectLevels(subject.id);
          if (
            response?.gradeSubjectId !== undefined &&
            String(response.gradeSubjectId) !== String(subject.id)
          ) {
            return subject;
          }
          const rows = Array.isArray(response)
            ? response
            : Array.isArray(response?.levels)
              ? response.levels
              : Array.isArray(response?.gameLevels)
                ? response.gameLevels
                : Array.isArray(response?.data?.levels)
                  ? response.data.levels
                  : [];
          const levels: CurrentLevel[] = rows.flatMap((row: any) => {
            const id = row?.id ?? row?.levelId;
            const rowGradeSubjectId = row?.gradeSubjectId ?? response?.gradeSubjectId;
            const levelNumber = Number(row?.levelNumber ?? row?.number);
            if (
              id === undefined || id === null || !Number.isFinite(Number(id)) || Number(id) <= 0 ||
              String(rowGradeSubjectId) !== String(subject.id) ||
              !Number.isFinite(levelNumber)
            ) return [];
            if (row?.active === false) return [];
            return [{
              id,
              gradeSubjectId: subject.id!,
              levelNumber,
              pointsRequired: Number(row?.requiredPoints ?? row?.pointsRequired ?? 0),
              timeLimit: Number(row?.timeLimit ?? row?.time ?? 0),
              pointsAcquired: Number(row?.pointsAcquired ?? row?.earnedPoints ?? row?.bestScore ?? 0),
            }];
          })
            .filter((level: CurrentLevel) => Number.isFinite(level.levelNumber))
            .sort((left: CurrentLevel, right: CurrentLevel) => left.levelNumber - right.levelNumber);

          if (!levels.length) return { ...subject, currentLevel: null };

          let highestUnlockedIndex = 0;
          for (let index = 1; index < levels.length; index += 1) {
            const previousProgress = progressRecords.find(
              (record) => String(record?.gameLevelId ?? record?.levelId) === String(levels[index - 1].id),
            );
            if (previousProgress?.completed !== true) break;
            highestUnlockedIndex = index;
          }

          const currentLevel = levels[highestUnlockedIndex];
          const progress = progressRecords.find(
            (record) => String(record?.gameLevelId ?? record?.levelId) === String(currentLevel.id),
          );
          const pointsAcquired = Number(
            progress?.bestScore ?? progress?.score ?? progress?.px ?? currentLevel.pointsAcquired ?? 0,
          ) + Number(progress?.pendingXp ?? 0);

          return {
            ...subject,
            currentLevel: {
              ...currentLevel,
              pointsAcquired: Number.isFinite(pointsAcquired) ? pointsAcquired : 0,
            },
          };
        } catch (error) {
          if (isNetworkError(error)) networkUnavailable = true;
          return { ...subject, currentLevel: null };
        }
      }));

      if (!isCancelled()) {
        setLoadedSubjects(subjectsWithLevels);
        if (networkUnavailable) setErrorMessage(NO_INTERNET_MESSAGE);
      }
    } finally {
      if (!isCancelled()) setIsLoadingLevels(false);
    }
  };
  loadCurrentLevelsRef.current = loadCurrentLevels;

  return (
    <View style={[styles.overlay, isWeb && styles.webOverlay, style]}>
      <View style={styles.card}>
        <AppText style={styles.title}>Select a subject</AppText>
        {isLoading && (
          <AppText style={styles.loadingText}>Loading subjects...</AppText>
        )}
        {isLoadingLevels && (
          <AppText style={styles.loadingText}>Loading levels...</AppText>
        )}
        {errorMessage && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              lastFetchedGrade.current = null;
              setReloadKey((key) => key + 1);
            }}
          >
            <AppText style={styles.errorText}>{errorMessage}</AppText>
          </Pressable>
        )}
        <View style={styles.list}>
          {displaySubjects.map((subject, index) => {
            const isActive = subject.name === selectedSubject;
            const levelIsLoading = isLoading || isLoadingLevels;
            const canSelect = !levelIsLoading && Boolean(subject.id) && Boolean(subject.currentLevel);

            return (
              <Pressable
                key={`${subject.id ?? subject.name}-${index}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSelect }}
                disabled={!canSelect}
                onPress={() => {
                  if (!subject.currentLevel || subject.id === undefined || subject.id === null) return;
                  setSelectedSubject(subject.name);
                  onSelectSubject?.(
                    subject.name,
                    index,
                    subject.id,
                    subject.currentLevel,
                  );
                }}
                style={({ pressed }) => [
                  styles.subjectButton,
                  isWeb && styles.webSubjectButton,
                  isActive && styles.activeSubjectButton,
                  pressed && styles.pressedSubjectButton,
                ]}
              >
                <View style={styles.subjectCopy}>
                  <AppText
                    style={[
                      styles.subjectText,
                      isActive && styles.activeSubjectText,
                    ]}
                  >
                    {subject.name}
                  </AppText>
                  <AppText style={styles.levelText}>
                    {subject.currentLevel
                      ? `Level ${subject.currentLevel.levelNumber}`
                      : "Level unavailable"}
                  </AppText>
                </View>
                <AppText style={styles.subjectChevron}>›</AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    inset: 0,
    zIndex: 50,
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
  loadingText: {
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
  list: {
    width: "100%",
    gap: 12,
  },
  subjectButton: {
    minHeight: 72,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    backgroundColor: "#fff4d7",
    borderWidth: 2,
    borderColor: "#e6b95b",
  },
  webSubjectButton: {
    minHeight: 78,
  },
  activeSubjectButton: {
    backgroundColor: "#f7b539",
    borderColor: "#fff5d1",
  },
  pressedSubjectButton: {
    opacity: 0.9,
  },
  subjectText: {
    color: "#4b2d00",
    fontSize: 20,
    fontFamily: "FredokaBold",
  },
  activeSubjectText: {
    color: "#4b2d00",
  },
  subjectCopy: {
    flex: 1,
  },
  levelText: {
    marginTop: 2,
    color: "#795f3d",
    fontFamily: "FredokaMedium",
    fontSize: 13,
  },
  subjectChevron: {
    marginLeft: 10,
    color: "#98743d",
    fontFamily: "FredokaBold",
    fontSize: 27,
  },
});
