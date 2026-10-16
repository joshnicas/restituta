import fs from "node:fs";
import path from "node:path";
import multer from "multer";

export const SONGS_STORAGE_DIR = path.resolve(process.cwd(), "storage/app/public/songs");
fs.mkdirSync(SONGS_STORAGE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SONGS_STORAGE_DIR),
  filename: (_req, file, cb) => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${suffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const mediaFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = file.mimetype.startsWith("audio/") || file.mimetype.startsWith("video/");
  if (allowed) cb(null, true);
  else cb(new Error("Only audio and video files are allowed."));
};

export const uploadSongMedia = multer({
  storage,
  fileFilter: mediaFilter,
  limits: { fileSize: 250 * 1024 * 1024 },
});
