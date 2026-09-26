import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    // Replace req.body with the parsed/typed data.
    req.body = result.data;
    next();
  };
}

// Same pattern as `validate`, but for req.query (e.g. GET /api/toilets,
// GET /api/toilets/nearby) rather than req.body.
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    // Stashed separately from req.query (rather than overwriting it)
    // so behavior doesn't depend on the Express version's query-object
    // mutability. Controllers read req.validatedQuery, typed via the
    // matching Zod schema's inferred type.
    req.validatedQuery = result.data;
    next();
  };
}
