import { NextFunction, Request, Response } from 'express';
import * as complaintService from '../services/complaint.service';
import { AppError } from '../utils/AppError';
import {
  CreateComplaintInput,
  ListComplaintsQuery,
  UpdateComplaintStatusInput,
} from '../validators/complaint.validators';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      // Defensive: authenticate middleware always runs first on this router.
      throw new AppError('Not authenticated', 401);
    }

    const complaint = await complaintService.createComplaint(
      req.user.id,
      req.body as CreateComplaintInput,
      req.file
    );
    res.status(201).json({ complaint });
  } catch (err) {
    next(err);
  }
}

export async function my(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const complaints = await complaintService.listMyComplaints(req.user.id);
    res.status(200).json({ complaints });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const complaint = await complaintService.getComplaintById(req.params.id, req.user);
    res.status(200).json({ complaint });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.validatedQuery as ListComplaintsQuery;
    const result = await complaintService.listComplaints(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.body as UpdateComplaintStatusInput;
    const complaint = await complaintService.updateComplaintStatus(req.params.id, status);
    res.status(200).json({ complaint });
  } catch (err) {
    next(err);
  }
}
