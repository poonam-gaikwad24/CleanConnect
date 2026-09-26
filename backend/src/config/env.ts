import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  FRONTEND_URL: z.string().min(1).default('http://localhost:5173'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('1h'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().positive().default(12),

  // --- Module 5: complaint image storage ---
  // All optional. If the three Cloudinary vars are absent, complaint
  // photos fall back to local disk storage under /uploads — see
  // imageStorage.service.ts. APP_URL is only used to build that local
  // fallback's URL; it's irrelevant once Cloudinary is configured.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  APP_URL: z.string().min(1).default('http://localhost:5000'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
