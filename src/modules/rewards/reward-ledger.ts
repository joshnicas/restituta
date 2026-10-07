import type { Prisma } from "@prisma/client";

export type RewardSource = "ATTEMPT" | "PRACTICE" | "LEVEL_PASS" | "CHALLENGE" | "GIFT";

export function recordReward(
  transaction: Prisma.TransactionClient,
  reward: {
    userId: number;
    sourceType: RewardSource;
    sourceId: string;
    xpDelta?: number;
    starsDelta?: number;
    gradeId?: number | null;
    subjectId?: number | null;
    earnedAt?: Date;
  },
) {
  const xpDelta = reward.xpDelta ?? 0;
  const starsDelta = reward.starsDelta ?? 0;
  if (xpDelta <= 0 && starsDelta <= 0) return Promise.resolve(null);

  return transaction.userRewardLedger.create({
    data: {
      userId: reward.userId,
      sourceType: reward.sourceType,
      sourceId: reward.sourceId,
      xpDelta,
      starsDelta,
      gradeId: reward.gradeId ?? null,
      subjectId: reward.subjectId ?? null,
      ...(reward.earnedAt ? { earnedAt: reward.earnedAt } : {}),
    },
  });
}
