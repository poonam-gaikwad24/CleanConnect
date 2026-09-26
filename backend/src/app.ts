import path from 'node:path';
import cors from 'cors';
import express, { Request, Response } from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import authRoutes from './routes/auth.routes';
import complaintRoutes from './routes/complaint.routes';
import testRoutes from './routes/test.routes';
import toiletRoutes from './routes/toilet.routes';
import toiletRequestRoutes from './routes/toiletRequest.routes';

export const app = express();

app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json());

// Module 5: only used when complaint photos fall back to local-disk
// storage (no CLOUDINARY_* env vars set — see imageStorage.service.ts).
// Serves e.g. GET /uploads/complaints/<file> as a plain static file.
// Harmless/no-op when the directory doesn't exist yet or Cloudinary is
// configured instead.
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check — intentionally independent of the database so it
// reflects whether the API process itself is up. Prisma/PostgreSQL
// connectivity is verified separately via `npm run db:verify`.
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'CleanConnect API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/toilets', toiletRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/toilet-requests', toiletRequestRoutes);

// TEMPORARY: remove this mount once RBAC has been manually verified.
app.use('/api/test', testRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
