import type { PracticeCompleteResponse, PracticeMode, PracticeQuestion, PracticeSession } from "./api";

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
