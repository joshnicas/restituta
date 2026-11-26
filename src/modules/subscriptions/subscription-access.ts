import prisma from "../../prisma";

export async function hasActiveSubscriptionAccess(userId: number, now = new Date()): Promise<boolean> {
  const [paidSubscription, user] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE", expiresAt: { gt: now } },
      select: { id: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { trialEndsAt: true } }),
  ]);
  return Boolean(paidSubscription || (user?.trialEndsAt && user.trialEndsAt > now));
}
