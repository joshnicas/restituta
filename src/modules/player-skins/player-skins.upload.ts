import multer from "multer";
import { gcsMulterStorage } from "../storage/multer-storage";

const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed."));
  }
};

export const uploadSkinImages = multer({
  storage: gcsMulterStorage("skins"),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const SKINS_STORAGE_DIR = "";
