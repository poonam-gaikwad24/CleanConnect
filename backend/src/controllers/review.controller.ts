import { NextFunction, Request, Response } from 'express';
import * as reviewService from '../services/review.service';
import { AppError } from '../utils/AppError';
import { ReviewInput } from '../validators/review.validators';

export async function listForToilet(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reviewService.getToiletReviews(req.params.toiletId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const review = await reviewService.createReview(
      req.user.id,
      req.params.toiletId,
      req.body as ReviewInput
    );
    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const review = await reviewService.updateReview(
      req.params.id,
      req.user.id,
      req.body as ReviewInput
    );
    res.status(200).json({ review });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    await reviewService.deleteReview(req.params.id, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
