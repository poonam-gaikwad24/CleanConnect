import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

const CLOUDINARY_CONFIGURED = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);

if (CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

// Only used by the local-disk fallback path.
const LOCAL_UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

function extensionFor(file: Express.Multer.File): string {
  const fromName = path.extname(file.originalname);
  if (fromName) return fromName;

  switch (file.mimetype) {
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '.jpg';
  }
}

// Uploads one evidence photo and returns its public URL — never the
// image bytes themselves (those are never stored in PostgreSQL; see
// the Complaint/ToiletRegistrationRequest models' imageUrl comments).
// `folder` only affects where the file lands (a Cloudinary folder, or
// a local-disk subdirectory) — the storage logic itself is identical
// for every image CleanConnect handles, whether it's complaint
// evidence (Module 5) or registration-request evidence (Module 6).
//
// Cloudinary is used when the project has been configured with the
// three CLOUDINARY_* env vars (see .env.example). Otherwise this
// falls back to writing the file to local disk under backend/uploads
// and serving it via the static middleware mounted in app.ts — this
// keeps local development and testing possible without a Cloudinary
// account, and is a one-step swap to Cloudinary in production (set
// the env vars — no code change needed).
async function uploadImage(file: Express.Multer.File, folder: string): Promise<string> {
  const filename = `${randomUUID()}${extensionFor(file)}`;

  if (CLOUDINARY_CONFIGURED) {
    return uploadToCloudinary(file, filename, folder);
  }

  return uploadToLocalDisk(file, filename, folder);
}

// Module 5: complaint evidence photos.
export function uploadComplaintImage(file: Express.Multer.File): Promise<string> {
  return uploadImage(file, 'complaints');
}

// Module 6: missing-toilet registration request evidence photos.
export function uploadToiletRequestImage(file: Express.Multer.File): Promise<string> {
  return uploadImage(file, 'toilet-requests');
}

function uploadToCloudinary(
  file: Express.Multer.File,
  filename: string,
  folder: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `cleanconnect/${folder}`,
        public_id: filename.replace(path.extname(filename), ''),
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed with no result'));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
}

async function uploadToLocalDisk(
  file: Express.Multer.File,
  filename: string,
  folder: string
): Promise<string> {
  const dir = path.join(LOCAL_UPLOAD_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.promises.writeFile(filePath, file.buffer);
  return `${env.APP_URL}/uploads/${folder}/${filename}`;
}
