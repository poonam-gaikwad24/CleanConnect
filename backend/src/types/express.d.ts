import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
      // Populated by middleware/validate.ts's validateQuery. Typed as
      // unknown here (not any) — each controller narrows it via the
      // matching Zod schema's inferred type before use.
      validatedQuery?: unknown;
    }
  }
}

export {};
