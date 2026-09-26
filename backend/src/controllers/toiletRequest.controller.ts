import { NextFunction, Request, Response } from 'express';
import * as toiletRequestService from '../services/toiletRequest.service';
import { AppError } from '../utils/AppError';
import {
  CreateToiletRequestInput,
  ListToiletRequestsQuery,
  ReviewToiletRequestInput,
} from '../validators/toiletRequest.validators';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const request = await toiletRequestService.createRequest(
      req.user.id,
      req.body as CreateToiletRequestInput,
      req.file
    );
    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
}

export async function my(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const requests = await toiletRequestService.listMyRequests(req.user.id);
    res.status(200).json({ requests });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const request = await toiletRequestService.getRequestById(req.params.id, req.user);
    res.status(200).json({ request });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.validatedQuery as ListToiletRequestsQuery;
    const result = await toiletRequestService.listRequests(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const { adminNotes } = req.body as ReviewToiletRequestInput;
    const request = await toiletRequestService.approveRequest(req.params.id, adminNotes);
    res.status(200).json({ request });
  } catch (err) {
    next(err);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const { adminNotes } = req.body as ReviewToiletRequestInput;
    const request = await toiletRequestService.rejectRequest(req.params.id, adminNotes);
    res.status(200).json({ request });
  } catch (err) {
    next(err);
  }
}
