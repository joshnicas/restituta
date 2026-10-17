import { randomUUID } from "node:crypto";
import path from "node:path";
import type { Request } from "express";
import type { StorageEngine } from "multer";
import { createObjectPath, deleteObject, uploadBuffer, uploadStream } from "./gcs-storage";
import { mediaUrl } from "./media";

export type GcsMulterFile = Express.Multer.File & { objectPath: string };

export function gcsMulterStorage(prefix: "images" | "audios" | "players" | "skins" | "songs"): StorageEngine {
  return {
    _handleFile(_req: Request, file: Express.Multer.File, callback) {
      const objectPath = createObjectPath(prefix, file.originalname);
      uploadStream(objectPath, file.stream, file.mimetype)
        .then(() => callback(null, {
          destination: "gcs",
          filename: path.posix.basename(objectPath),
          path: mediaUrl(prefix, objectPath),
          size: 0,
          objectPath,
        } as Partial<Express.Multer.File> & { objectPath: string }))
        .catch((error: unknown) => callback(error instanceof Error ? error : new Error("Upload failed.")));
    },
    _removeFile(_req: Request, file, callback) {
      // Multer calls this when a later multipart file fails; controller-level
      // cleanup handles objects after parsing has completed.
      const objectPath = (file as GcsMulterFile).objectPath;
      if (!objectPath) { callback(null); return; }
      deleteObject(objectPath).then(() => callback(null))
        .catch((error: unknown) => callback(error instanceof Error ? error : new Error("Cleanup failed.")));
    },
  };
}

export async function persistBufferedUpload(
  file: Express.Multer.File | undefined,
  prefix: "images" | "audios" | "players" | "skins",
): Promise<string | undefined> {
  if (!file) return undefined;
  if (!file.buffer) throw new Error("Uploaded file data is unavailable.");
  const objectPath = createObjectPath(prefix, file.originalname);
  await uploadBuffer(objectPath, file.buffer, file.mimetype);
  (file as GcsMulterFile).objectPath = objectPath;
  file.filename = path.posix.basename(objectPath);
  file.path = mediaUrl(prefix, objectPath);
  return objectPath;
}

export function uploadedObjectPath(file: Express.Multer.File | undefined): string | undefined {
  return file && "objectPath" in file && typeof file.objectPath === "string" ? file.objectPath : undefined;
}
