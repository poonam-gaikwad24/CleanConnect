import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

// One optional evidence photo — used for both complaint evidence
// (Module 5) and toilet-registration-request evidence (Module 6). The
// validation rules (allowed types, max size) are identical for both,
// so this single multer config is reused rather than duplicated; only
// the multipart field name is fixed ('image') and the same for both
// use cases. Buffered in memory (not written to disk here) so
// imageStorage.service.ts can hand the same buffer to either
// Cloudinary or the local-disk fallback without an extra file-read —
// fine at this project's expected upload volume.
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError('Only JPEG, PNG, or WEBP images are allowed', 400));
      return;
    }
    cb(null, true);
  },
}).single('image');

// Wraps multer so both its own errors (e.g. file too large) and our
// fileFilter's AppError land in the app's normal error-handling flow
// via next(err), instead of multer's default behavior of throwing
// outside the Express error chain.
export function handleSingleImageUpload(req: Request, res: Response, next: NextFunction): void {
  uploadSingleImage(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      next(new AppError(`Image upload error: ${err.message}`, 400));
      return;
    }

    next(err);
  });
}
