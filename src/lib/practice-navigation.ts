import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PracticeCompleteResponse, PracticeMode, PracticeQuestion, PracticeSession } from "./api";

const PRACTICE_USAGE_KEY = "kido.practiceUsedSections";

export function getPracticeSectionKey(session: Pick<PracticeSession, "mode" | "subjectId" | "topicId">): string {
  if (session.mode === "QUICK" || session.mode === "MISTAKES") return session.mode;
  if (session.topicId) return `TOPIC:${session.subjectId}:${session.topicId}`;
  return `SUBJECT:${session.subjectId}`;
}

async function practiceUsageStorageKey(): Promise<string> {
  const userKey = await AsyncStorage.getItem("kido.numericUserId") ?? await AsyncStorage.getItem("kido.userId") ?? "guest";
  return `${PRACTICE_USAGE_KEY}:${userKey}`;
}

export async function getLocallyUsedPracticeSections(): Promise<string[]> {
  try {
    const value = await AsyncStorage.getItem(await practiceUsageStorageKey());
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function recordCompletedPracticeSection(session: PracticeSession): Promise<void> {
  try {
    const storageKey = await practiceUsageStorageKey();
    const used = await getLocallyUsedPracticeSections();
    const section = getPracticeSectionKey(session);
    if (!used.includes(section)) await AsyncStorage.setItem(storageKey, JSON.stringify([...used, section]));
  } catch {
    // Server-side practice limits remain authoritative if local storage is unavailable.
  }
}

export type PracticeRoutePayload = {
  session: PracticeSession;
  questions: PracticeQuestion[];
  result?: PracticeCompleteResponse;
};

export type PracticeRestart = { mode: "QUICK" | "MISTAKES" } | { mode: "SUBJECT"; subjectId: string; topicId?: string };

export function restartFromSession(session: PracticeSession): PracticeRestart {
  if (session.mode === "SUBJECT" && session.subjectId) {
    return { mode: "SUBJECT", subjectId: session.subjectId, ...(session.topicId ? { topicId: session.topicId } : {}) };
  }
  return { mode: session.mode as Exclude<PracticeMode, "SUBJECT"> };
}
