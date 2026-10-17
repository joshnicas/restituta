import { randomUUID } from "node:crypto";
import { Storage } from "@google-cloud/storage";
import type { Readable } from "node:stream";

let storageClient: Storage | undefined;

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Cloud storage is not configured.");
    this.name = "StorageNotConfiguredError";
  }
}

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME?.trim();
  if (!bucketName) throw new StorageNotConfiguredError();
  storageClient ??= new Storage(); // Uses ADC; credentials are never read or logged here.
  return storageClient.bucket(bucketName);
}

export function normalizeObjectPath(objectPath: string): string {
  const normalized = objectPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (!normalized || segments.some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid storage object path.");
  }
  return normalized;
}

export function createObjectPath(prefix: string, originalName: string): string {
  const safePrefix = normalizeObjectPath(prefix).replace(/\/$/, "");
  const extension = originalName.match(/\.[a-zA-Z0-9]{1,12}$/)?.[0].toLowerCase() ?? "";
  return `${safePrefix}/${randomUUID()}${extension}`;
}

export async function uploadBuffer(
  objectPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const key = normalizeObjectPath(objectPath);
  console.info("GCS upload started", { objectPath: key, size: buffer.length });
  try {
    await getBucket().file(key).save(buffer, {
      resumable: false,
      metadata: { contentType, cacheControl: "public, max-age=3600" },
      validation: "crc32c",
    });
    console.info("GCS upload succeeded", { objectPath: key });
  } catch (error) {
    console.error("GCS upload failed", { objectPath: key, errorCode: errorCode(error) });
    if (error instanceof StorageNotConfiguredError) throw error;
    throw new Error("Could not store uploaded media.");
  }
}

export async function uploadStream(
  objectPath: string,
  stream: Readable,
  contentType: string,
): Promise<void> {
  const key = normalizeObjectPath(objectPath);
  console.info("GCS upload started", { objectPath: key });
  try {
    await new Promise<void>((resolve, reject) => {
      const destination = getBucket().file(key).createWriteStream({
        resumable: true,
        metadata: { contentType, cacheControl: "public, max-age=3600" },
        validation: "crc32c",
      });
      destination.once("finish", resolve);
      destination.once("error", reject);
      stream.once("error", reject);
      stream.pipe(destination);
    });
    console.info("GCS upload succeeded", { objectPath: key });
  } catch (error) {
    console.error("GCS upload failed", { objectPath: key, errorCode: errorCode(error) });
    if (error instanceof StorageNotConfiguredError) throw error;
    throw new Error("Could not store uploaded media.");
  }
}

export function readObject(objectPath: string): Readable {
  return getBucket().file(normalizeObjectPath(objectPath)).createReadStream();
}

export async function objectExists(objectPath: string): Promise<boolean> {
  try {
    const [exists] = await getBucket().file(normalizeObjectPath(objectPath)).exists();
    return exists;
  } catch (error) {
    console.error("GCS existence check failed", { objectPath, errorCode: errorCode(error) });
    throw new Error("Could not check stored media.");
  }
}

export async function deleteObject(objectPath: string): Promise<void> {
  const key = normalizeObjectPath(objectPath);
  try {
    await getBucket().file(key).delete({ ignoreNotFound: true });
  } catch (error) {
    console.error("GCS object cleanup failed", { objectPath: key, errorCode: errorCode(error) });
    throw new Error("Could not delete stored media.");
  }
}

function errorCode(error: unknown): string | number | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" || typeof code === "number") return code;
  }
  return undefined;
}
