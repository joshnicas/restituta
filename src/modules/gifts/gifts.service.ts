import type { PrismaClient } from "@prisma/client";
import prisma from "../../prisma";
import type { GiftCreateBody, GiftUpdateBody } from "./gifts.schema";
import { normalizeLanguage, resolveLocalizedText } from "../localization/language";
import { recordReward } from "../rewards/reward-ledger";

function localizeGift<T extends { name: string; description: string; translations?: Array<{ language: string; name: string; description: string }> }>(gift: T, requestedLanguage: unknown) {
  const { translations, ...fields } = gift;
  const byLanguage = Object.fromEntries((translations ?? []).map((translation) => [normalizeLanguage(translation.language), translation]));
  return {
    ...fields,
    name: resolveLocalizedText(requestedLanguage, {
      EN: byLanguage.EN?.name ?? gift.name,
      SW: byLanguage.SW?.name ?? byLanguage.EN?.name ?? gift.name,
    }, gift.name) ?? gift.name,
    description: resolveLocalizedText(requestedLanguage, {
      EN: byLanguage.EN?.description ?? gift.description,
      SW: byLanguage.SW?.description ?? byLanguage.EN?.description ?? gift.description,
    }, gift.description) ?? gift.description,
  };
}

function giftTranslationUpserts(translations: GiftCreateBody["translations"], giftId: string) {
  return (Object.entries(translations ?? {}) as Array<["EN" | "SW", { name: string; description: string } | undefined]>)
    .flatMap(([language, value]) => value ? [{
      where: { giftId_language: { giftId, language } },
      create: { language, name: value.name, description: value.description },
      update: { name: value.name, description: value.description },
    }] : []);
}

export function createGiftsService(database: PrismaClient) {
  return {
    listDefinitions: async (language: unknown = "EN") => {
      const gifts = await database.gift.findMany({
        orderBy: [{ type: "asc" }, { name: "asc" }],
        include: { translations: true },
      });
      return gifts.map((gift) => localizeGift(gift, language));
    },

    getDefinition: async (giftId: string, language: unknown = "EN") => {
      const gift = await database.gift.findUnique({ where: { id: giftId }, include: { translations: true } });
      return gift ? localizeGift(gift, language) : null;
    },

    createDefinition: async (data: GiftCreateBody) => {
      const { translations, ...fields } = data;
      const gift = await database.gift.create({
        data: {
          ...fields,
          ...(translations ? { translations: { create: Object.entries(translations).flatMap(([language, value]) => value ? [{ language: language as "EN" | "SW", ...value }] : []) } } : {}),
        },
        include: { translations: true },
      });
      return localizeGift(gift, "EN");
    },

    updateDefinition: async (giftId: string, data: GiftUpdateBody, language: unknown = "EN") => {
      const existing = await database.gift.findUnique({ where: { id: giftId } });
      if (!existing) return null;
      const { translations, ...fields } = data;
      const upserts = giftTranslationUpserts(translations, giftId);
      const gift = await database.gift.update({
        where: { id: giftId },
        data: { ...fields, ...(upserts.length ? { translations: { upsert: upserts } } : {}) },
        include: { translations: true },
      });
      return localizeGift(gift, language);
    },

    deleteDefinition: async (giftId: string) => {
      const existing = await database.gift.findUnique({ where: { id: giftId } });
      if (!existing) return null;
      return database.gift.delete({ where: { id: giftId } });
    },

    award: async (userId: number, giftId: string, language: unknown = "EN") => database.$transaction(async (tx) => {
      const [user, gift] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { id: true, gradeId: true } }),
        tx.gift.findUnique({ where: { id: giftId }, include: { translations: true } }),
      ]);
      if (!user) throw new Error("User not found.");
      if (!gift) throw new Error("Gift not found.");

      const userGift = await tx.userGift.create({
        data: { userId, giftId },
        include: { gift: { include: { translations: true } } },
      });
      const profile = await tx.userGameProfile.upsert({
        where: { userId },
        update: {
          ...(gift.pointsAwarded ? { xp: { increment: gift.pointsAwarded } } : {}),
          ...(gift.starsAwarded ? { stars: { increment: gift.starsAwarded } } : {}),
        },
        create: { userId, xp: gift.pointsAwarded, stars: gift.starsAwarded },
        select: { xp: true, stars: true },
      });
      await recordReward(tx, {
        userId,
        sourceType: "GIFT",
        sourceId: userGift.id,
        xpDelta: gift.pointsAwarded,
        starsDelta: gift.starsAwarded,
        gradeId: user.gradeId,
        earnedAt: userGift.awardedAt,
      });

      return {
        gift: localizeGift(gift, language),
        userGift: {
          id: userGift.id,
          awardedAt: userGift.awardedAt,
          isViewed: userGift.isViewed,
        },
        reward: {
          pointsAwarded: gift.pointsAwarded,
          starsAwarded: gift.starsAwarded,
        },
        profile,
      };
    }),

    listUserGifts: async (userId: number, page: number, limit: number, language: unknown = "EN") => {
      const user = await database.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) throw new Error("User not found.");
      const where = { userId };
      const [userGifts, total, newCount] = await Promise.all([
        database.userGift.findMany({
          where,
          include: { gift: { include: { translations: true } } },
          orderBy: { awardedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        database.userGift.count({ where }),
        database.userGift.count({ where: { ...where, isViewed: false } }),
      ]);
      return {
        userGifts: userGifts.map((userGift) => ({ ...userGift, gift: localizeGift(userGift.gift, language) })),
        total, newCount, page, limit, totalPages: Math.ceil(total / limit),
      };
    },

    getUserGift: async (userId: number, userGiftId: string, language: unknown = "EN") => {
      const userGift = await database.userGift.findFirst({
        where: { id: userGiftId, userId },
        include: { gift: { include: { translations: true } } },
      });
      return userGift ? { ...userGift, gift: localizeGift(userGift.gift, language) } : null;
    },

    markViewed: async (userId: number, userGiftId: string, language: unknown = "EN") => {
      const existing = await database.userGift.findFirst({ where: { id: userGiftId, userId } });
      if (!existing) return null;
      return database.userGift.update({
        where: { id: userGiftId },
        data: { isViewed: true },
        include: { gift: { include: { translations: true } } },
      }).then((userGift) => ({ ...userGift, gift: localizeGift(userGift.gift, language) }));
    },
  };
}

export const giftsService = createGiftsService(prisma);
