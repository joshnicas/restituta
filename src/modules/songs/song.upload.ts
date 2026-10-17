import multer from "multer";
import { gcsMulterStorage } from "../storage/multer-storage";

const mediaFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = file.mimetype.startsWith("audio/") || file.mimetype.startsWith("video/");
  if (allowed) cb(null, true);
  else cb(new Error("Only audio and video files are allowed."));
};

export const uploadSongMedia = multer({
  storage: gcsMulterStorage("songs"),
  fileFilter: mediaFilter,
  limits: { fileSize: 250 * 1024 * 1024 },
});

export const SONGS_STORAGE_DIR = "";
