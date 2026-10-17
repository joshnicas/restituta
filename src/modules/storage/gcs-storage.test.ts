import assert from "node:assert/strict";
import { test } from "node:test";
import { createObjectPath, normalizeObjectPath, StorageNotConfiguredError, uploadBuffer } from "./gcs-storage";
import { mediaUrl, objectPathFromMediaUrl } from "./media";
import { normalizeRequestedMediaPath } from "./media";

test("storage object paths reject traversal and normalize separators", () => {
  assert.equal(normalizeObjectPath("/images\\asset.png"), "images/asset.png");
  assert.throws(() => normalizeObjectPath("images/../private.png"), /Invalid storage object path/);
  assert.throws(() => normalizeObjectPath("images//asset.png"), /Invalid storage object path/);
});

test("new media object paths are collision resistant and preserve a safe extension", () => {
  const first = createObjectPath("songs", "my song.MP3");
  const second = createObjectPath("songs", "my song.MP3");
  assert.match(first, /^songs\/[0-9a-f-]{36}\.mp3$/);
  assert.notEqual(first, second);
});

test("stable media URLs retain existing route prefixes and can map back to object keys", () => {
  const url = mediaUrl("images", "images/4ce5837e-26e7-4167-a9db-bb668c97c904.png");
  assert.equal(url, "/images/4ce5837e-26e7-4167-a9db-bb668c97c904.png");
  assert.equal(objectPathFromMediaUrl(url), url.slice(1));
  assert.equal(objectPathFromMediaUrl("https://example.test/asset.png"), null);
  assert.equal(objectPathFromMediaUrl("/images/../private.png"), null);
});

test("media delivery preserves nested paths and decodes URL-encoded path segments", () => {
  assert.equal(normalizeRequestedMediaPath("images", "lessons/unit 1/example.png"), "images/lessons/unit 1/example.png");
  assert.equal(normalizeRequestedMediaPath("images", "lessons/unit%201/example.png"), "images/lessons/unit 1/example.png");
  assert.throws(() => normalizeRequestedMediaPath("images", "lessons/../private.png"), /Invalid storage object path/);
  assert.throws(() => normalizeRequestedMediaPath("images", "lessons%2F..%2Fprivate.png"), /Invalid storage object path/);
});

test("missing bucket configuration fails only when a storage operation is requested", async () => {
  const original = process.env.GCS_BUCKET_NAME;
  delete process.env.GCS_BUCKET_NAME;
  try {
    await assert.rejects(uploadBuffer("images/test.png", Buffer.from("test"), "image/png"), StorageNotConfiguredError);
  } finally {
    if (original === undefined) delete process.env.GCS_BUCKET_NAME;
    else process.env.GCS_BUCKET_NAME = original;
  }
});
