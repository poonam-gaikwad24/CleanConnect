import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Always log the full error server-side for debugging.
  console.error(err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Unexpected errors: never leak internal details (stack traces,
  // Prisma/DB error text, etc.) to the client.
  res.status(500).json({
    status: 'error',
    message: 'Unexpected server error',
  });
}
