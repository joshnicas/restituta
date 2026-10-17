import fs from "node:fs";
import path from "node:path";
import type { Request, Response, NextFunction } from "express";
import { deleteObject, normalizeObjectPath, readObject, StorageNotConfiguredError } from "./gcs-storage";
import prisma from "../../prisma";

const MEDIA_ROOTS: Record<string, string> = {
  images: "images",
  audios: "audios",
  players: "players",
  skins: "skins",
  songs: "songs",
};

export function mediaUrl(prefix: keyof typeof MEDIA_ROOTS, objectPath: string): string {
  const key = normalizeObjectPath(objectPath);
  const expected = `${MEDIA_ROOTS[prefix]}/`;
  if (!key.startsWith(expected)) throw new Error("Storage path does not match media type.");
  return `/${key}`;
}

export function objectPathFromMediaUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith("/")) return null;
  try {
    const decoded = decodeURIComponent(url.split("?")[0]);
    const key = normalizeObjectPath(decoded);
    return Object.values(MEDIA_ROOTS).some((prefix) => key.startsWith(`${prefix}/`)) ? key : null;
  } catch {
    return null;
  }
}

export async function cleanupMediaUrl(url: string | null | undefined): Promise<void> {
  const key = objectPathFromMediaUrl(url);
  if (!key) return;
  const filename = key.slice(key.indexOf("/") + 1);
  const legacyRoots: Record<string, string> = {
    images: "images", audios: "audios", players: "players", skins: "skins", songs: "songs",
  };
  const roots = legacyRoots[key.split("/")[0]];
  if (!roots) return;
  const localPath = path.resolve(process.cwd(), "storage/app/public", roots, filename);
  try {
    await fs.promises.access(localPath);
    return; // Legacy local media may be shared; leave it intact.
  } catch {
    // New media is served from GCS.
  }

  const stillReferenced = await isReferenced(url!);
  if (stillReferenced) return;
  await deleteObject(key);
}

async function isReferenced(url: string): Promise<boolean> {
  const [image, audio, song, player, skin, optionImage, questionMedia, user] = await Promise.all([
    prisma.image.findFirst({ where: { url }, select: { id: true } }),
    prisma.audio.findFirst({ where: { url }, select: { id: true } }),
    prisma.song.findFirst({ where: { url }, select: { id: true } }),
    prisma.player.findFirst({ where: { OR: [{ url1: url }, { url2: url }] }, select: { id: true } }),
    prisma.playerSkin.findFirst({ where: { OR: [{ url1: url }, { url2: url }] }, select: { id: true } }),
    prisma.questionOptionImage.findFirst({ where: { url }, select: { id: true } }),
    prisma.questionMedia.findFirst({ where: { url }, select: { id: true } }),
    prisma.user.findFirst({ where: { profilePic: url }, select: { id: true } }),
  ]);
  return Boolean(image || audio || song || player || skin || optionImage || questionMedia || user);
}

export function mediaDelivery(prefix: keyof typeof MEDIA_ROOTS, legacyDirectory: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const routeName = req.params.path ?? req.params["0"];
    const rawName = Array.isArray(routeName) ? routeName.join("/") : routeName;
    if (typeof rawName !== "string") {
      res.status(404).end();
      return;
    }
    const name = rawName;
    if (!name || name.startsWith("/") || name.includes("\\") || name.split("/").some((part) => !part || part === "." || part === "..")) {
      res.status(404).end();
      return;
    }

    const filename = path.basename(name);
    const legacyPath = path.join(legacyDirectory, filename);
    fs.stat(legacyPath, (statError, stat) => {
      if (!statError && stat.isFile()) {
        console.info("Serving legacy local media", { prefix, filename });
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.sendFile(legacyPath, (error) => { if (error && !res.headersSent) next(error); });
        return;
      }

      const objectPath = `${MEDIA_ROOTS[prefix]}/${filename}`;
      try {
        const objectStream = readObject(objectPath);
        objectStream.once("response", (response: { headers?: Record<string, string> }) => {
          const contentType = response.headers?.["content-type"];
          if (contentType && !res.headersSent) res.setHeader("Content-Type", contentType);
          const cacheControl = response.headers?.["cache-control"];
          if (cacheControl && !res.headersSent) res.setHeader("Cache-Control", cacheControl);
        });
        objectStream.once("error", (error: unknown) => {
          const code = typeof error === "object" && error !== null && "code" in error
            ? (error as { code?: unknown }).code
            : undefined;
          if (code === 404) {
            console.warn("Media object missing", { objectPath });
            if (!res.headersSent) res.status(404).json({ success: false, message: "Media not found." });
          } else {
            console.error("Media read failed", { objectPath, errorCode: code });
            if (!res.headersSent) res.status(503).json({ success: false, message: "Media is temporarily unavailable." });
            else res.destroy();
          }
        });
        objectStream.pipe(res);
      } catch (error) {
        const status = error instanceof StorageNotConfiguredError ? 503 : 500;
        console.warn("Media delivery unavailable", { objectPath, status });
        res.status(status).json({ success: false, message: "Media is temporarily unavailable." });
      }
    });
  };
}
