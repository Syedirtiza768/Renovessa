/**
 * Local filesystem storage for bathroom media uploads.
 * Paths are relative to UPLOAD_ROOT (default: <cwd>/uploads).
 * Docker mounts a volume at /app/uploads for persistence.
 */

import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

export const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(process.cwd(), "uploads");

export const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PHOTOS_PER_PROJECT = 20;

export function extForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/heic":
      return ".heic";
    case "image/heif":
      return ".heif";
    default:
      return ".bin";
  }
}

export async function ensureProjectUploadDir(projectId: string): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, "bathroom", projectId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function saveBathroomUpload(params: {
  projectId: string;
  mimeType: string;
  bytes: Buffer;
  originalName: string;
}): Promise<{ storagePath: string; fileName: string }> {
  if (!ALLOWED_MIME.has(params.mimeType)) {
    throw Object.assign(new Error("Only JPEG, PNG, WebP, or HEIC images are allowed."), { status: 400 });
  }
  if (params.bytes.length > MAX_UPLOAD_BYTES) {
    throw Object.assign(new Error("Each photo must be 10 MB or smaller."), { status: 400 });
  }
  if (params.bytes.length === 0) {
    throw Object.assign(new Error("Empty file."), { status: 400 });
  }

  const dir = await ensureProjectUploadDir(params.projectId);
  const safeBase = params.originalName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80) || "photo";
  const fileName = `${Date.now()}-${randomBytes(4).toString("hex")}-${safeBase}${
    path.extname(safeBase) ? "" : extForMime(params.mimeType)
  }`;
  const abs = path.join(dir, fileName);
  await writeFile(abs, params.bytes);

  // Store path relative to UPLOAD_ROOT for portability
  const storagePath = path.join("bathroom", params.projectId, fileName).replace(/\\/g, "/");
  return { storagePath, fileName };
}

export async function readBathroomUpload(storagePath: string): Promise<Buffer> {
  // Prevent path traversal
  const normalized = path.normalize(storagePath).replace(/^(\.\.(\/|\\|$))+/, "");
  if (normalized.includes("..") || path.isAbsolute(normalized)) {
    throw Object.assign(new Error("Invalid storage path"), { status: 400 });
  }
  const abs = path.join(UPLOAD_ROOT, normalized);
  if (!abs.startsWith(path.join(UPLOAD_ROOT))) {
    throw Object.assign(new Error("Invalid storage path"), { status: 400 });
  }
  return readFile(abs);
}

export async function deleteBathroomUpload(storagePath: string): Promise<void> {
  try {
    const normalized = path.normalize(storagePath).replace(/^(\.\.(\/|\\|$))+/, "");
    const abs = path.join(UPLOAD_ROOT, normalized);
    if (!abs.startsWith(path.join(UPLOAD_ROOT))) return;
    await unlink(abs);
  } catch {
    // ignore missing files
  }
}
