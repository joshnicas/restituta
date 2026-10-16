import fs from "node:fs/promises";
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { requireAdmin } from "../admin/admin.middleware";
import { SONGS_STORAGE_DIR, uploadSongMedia } from "./song.upload";
import { parseSongCreateBody, parseSongUpdateBody } from "./songs.schema";
import { songsService } from "./songs.service";

const songsRoutes = Router();
type FileRequest = Request & { file?: Express.Multer.File };
const idOf = (req: Request) => Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
const removeFile = async (url?: string | null) => {
  if (!url?.startsWith("/songs/")) return;
  const filename = url.slice("/songs/".length);
  if (!filename || filename.includes("/") || filename.includes("\\")) return;
  await fs.unlink(`${SONGS_STORAGE_DIR}/${filename}`).catch(() => undefined);
};
const parseUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadSongMedia.single("media")(req, res, (error) => {
    if (error) { res.status(400).json({ success: false, message: error.message }); return; }
    next();
  });
};
const sendError = (res: Response, error: unknown, fallback: string) =>
  res.status(400).json({ success: false, message: error instanceof Error ? error.message : fallback });

songsRoutes.get("/admin", requireAdmin, async (_req, res) => {
  try {
    res.json({ success: true, songs: await songsService.list(true) });
  } catch (error) { sendError(res, error, "Could not load songs."); }
});

songsRoutes.get("/", async (_req, res) => {
  try { res.json({ success: true, songs: await songsService.list(false) }); }
  catch (error) { sendError(res, error, "Could not load songs."); }
});

songsRoutes.get("/:id", async (req, res) => {
  try {
    const id = idOf(req);
    const song = Number.isInteger(id) ? await songsService.getById(id) : null;
    if (!song) { res.status(404).json({ success: false, message: "Song not found." }); return; }
    res.json({ success: true, song });
  } catch (error) { sendError(res, error, "Could not load song."); }
});

songsRoutes.post("/", requireAdmin, parseUpload, async (req, res) => {
  const file = (req as FileRequest).file;
  try {
    const payload = parseSongCreateBody(req.body);
    if (!file && !payload.url) { res.status(400).json({ success: false, message: "Upload an audio/video file." }); return; }
    const mediaType = file ? (file.mimetype.startsWith("video/") ? "VIDEO" : "AUDIO") : payload.mediaType ?? "VIDEO";
    const url = file ? `/songs/${file.filename}` : payload.url!;
    const song = await songsService.create({ ...payload, url, mediaType });
    res.status(201).json({ success: true, song });
  } catch (error) {
    if (file) await removeFile(`/songs/${file.filename}`);
    sendError(res, error, "Could not create song.");
  }
});

songsRoutes.put("/:id", requireAdmin, parseUpload, async (req, res) => {
  const file = (req as FileRequest).file;
  try {
    const id = idOf(req);
    if (!Number.isInteger(id)) { res.status(400).json({ success: false, message: "Invalid song ID." }); return; }
    const payload = parseSongUpdateBody(req.body);
    const existing = await songsService.getById(id);
    if (!existing) { res.status(404).json({ success: false, message: "Song not found." }); return; }
    const mediaType = file ? (file.mimetype.startsWith("video/") ? "VIDEO" : "AUDIO") : payload.mediaType;
    const song = await songsService.update(id, { ...payload, ...(file ? { url: `/songs/${file.filename}`, mediaType } : {}) });
    if (file) await removeFile(existing.url);
    res.json({ success: true, song });
  } catch (error) {
    if (file) await removeFile(`/songs/${file.filename}`);
    sendError(res, error, "Could not update song.");
  }
});

songsRoutes.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = idOf(req);
    if (!Number.isInteger(id)) { res.status(400).json({ success: false, message: "Invalid song ID." }); return; }
    const song = await songsService.delete(id);
    await removeFile(song.url);
    res.json({ success: true, song });
  } catch (error) { sendError(res, error, "Could not delete song."); }
});

export default songsRoutes;
