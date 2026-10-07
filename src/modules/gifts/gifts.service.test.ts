import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import express from "express";
import { createGiftsService } from "./gifts.service";
import { parseGiftCreateBody } from "./gifts.schema";
import userGiftsRoutes from "./user-gifts.routes";

const giftFixture = {
  id: "gift-1",
  name: "Jungle Explorer",
  description: "A special reward.",
  imageUrl: "https://example.test/gift.png",
  type: "achievement",
  pointsAwarded: 100,
  starsAwarded: 5,
};

function fakeService(overrides: Record<string, any> = {}) {
  const calls: Record<string, any> = {};
  let awardNumber = 0;
  const tx = {
    user: { findUnique: async ({ where }: any) => overrides.user ?? (where.id === 7 ? { id: 7 } : null) },
    gift: { findUnique: async () => overrides.gift === undefined ? giftFixture : overrides.gift },
    userGift: {
      create: async ({ data, include }: any) => {
        calls.userGiftCreate = { data, include };
        awardNumber += 1;
        return { id: `user-gift-${awardNumber}`, userId: data.userId, giftId: data.giftId, awardedAt: new Date("2026-09-30T10:00:00Z"), isViewed: false, gift: giftFixture };
      },
    },
    userGameProfile: {
      upsert: async ({ update, create, select }: any) => {
        calls.profileUpsert = { update, create, select };
        return { xp: 100, stars: 5 };
      },
    },
  };
  const database: any = {
    $transaction: async (operation: (value: any) => Promise<any>) => operation(tx),
    gift: {
      create: async ({ data }: any) => ({ id: "gift-new", ...data }),
      findUnique: async () => overrides.gift === undefined ? giftFixture : overrides.gift,
      update: async ({ data }: any) => ({ ...giftFixture, ...data }),
      delete: async () => giftFixture,
      findMany: async () => [giftFixture],
    },
    user: { findUnique: async () => overrides.user ?? { id: 7 } },
    userGift: {
      create: tx.userGift.create,
      findMany: async (args: any) => { calls.findMany = args; return [{ id: "user-gift-1", gift: giftFixture }]; },
      count: async (args: any) => args.where?.isViewed === false ? 2 : 8,
      findFirst: async () => ({ id: "user-gift-1", userId: 7, isViewed: false, gift: giftFixture }),
      update: async ({ data, include }: any) => ({ id: "user-gift-1", userId: 7, isViewed: data.isViewed, gift: include ? giftFixture : undefined }),
    },
    userGameProfile: tx.userGameProfile,
  };
  return { service: createGiftsService(database), calls };
}

test("creating a Gift validates and stores its definition", async () => {
  const { service } = fakeService();
  const input = parseGiftCreateBody(giftFixture);
  const created = await service.createDefinition(input);
  assert.equal(created.name, giftFixture.name);
  assert.equal(created.pointsAwarded, 100);
  assert.equal(created.starsAwarded, 5);
});

test("awarding creates a UserGift and starts it unviewed", async () => {
  const { service, calls } = fakeService();
  const result = await service.award(7, "gift-1");
  assert.deepEqual(calls.userGiftCreate.data, { userId: 7, giftId: "gift-1" });
  assert.equal(result.userGift.isViewed, false);
  assert.equal(result.userGift.awardedAt.toISOString(), "2026-09-30T10:00:00.000Z");
});

test("awarding adds Gift points to the existing profile XP", async () => {
  const { service, calls } = fakeService();
  await service.award(7, "gift-1");
  assert.equal(calls.profileUpsert.update.xp.increment, 100);
});

test("awarding adds Gift stars to the existing profile", async () => {
  const { service, calls } = fakeService();
  const result = await service.award(7, "gift-1");
  assert.equal(calls.profileUpsert.update.stars.increment, 5);
  assert.deepEqual(result.reward, { pointsAwarded: 100, starsAwarded: 5 });
});

test("a gift can be awarded repeatedly without a user-gift uniqueness rule", async () => {
  const { service } = fakeService();
  const first = await service.award(7, "gift-1");
  const second = await service.award(7, "gift-1");
  assert.equal(first.userGift.id, "user-gift-1");
  assert.equal(second.userGift.id, "user-gift-2");
});

test("marking a gift as viewed changes isViewed to true", async () => {
  const { service } = fakeService();
  const viewed = await service.markViewed(7, "user-gift-1");
  assert.equal(viewed?.isViewed, true);
});

test("listing a user's gifts returns gift details and unread count", async () => {
  const { service } = fakeService();
  const result = await service.listUserGifts(7, 1, 20);
  assert.equal(result.userGifts[0].gift.name, giftFixture.name);
  assert.equal(result.newCount, 2);
});

test("gift pagination applies skip and take", async () => {
  const { service, calls } = fakeService();
  await service.listUserGifts(7, 3, 5);
  assert.equal(calls.findMany.skip, 10);
  assert.equal(calls.findMany.take, 5);
});

test("awarding a nonexistent gift is rejected", async () => {
  const { service } = fakeService({ gift: null });
  await assert.rejects(service.award(7, "missing"), /Gift not found/);
});

test("awarding a gift to a nonexistent user is rejected", async () => {
  const { service } = fakeService({ user: null });
  await assert.rejects(service.award(404, "gift-1"), /User not found/);
});

test("users cannot award gifts without an admin credential", async () => {
  const app = express();
  app.use(express.json());
  app.use("/users", userGiftsRoutes);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await fetch(`http://127.0.0.1:${address.port}/users/7/gifts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ giftId: "gift-1" }),
    });
    assert.equal(response.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
