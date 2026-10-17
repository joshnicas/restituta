import multer from "multer";
import { gcsMulterStorage } from "../storage/multer-storage";

const audioFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (file.mimetype.startsWith("audio/")) {
    cb(null, true);
  } else {
    cb(new Error("Only audio files are allowed."));
  }
};

export const uploadAudio = multer({
  storage: gcsMulterStorage("audios"),
  fileFilter: audioFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const AUDIOS_STORAGE_DIR = "";
