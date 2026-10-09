import { NextFunction, Request, Response } from 'express';
import * as staffService from '../services/staff.service';
import { CreateStaffInput } from '../validators/staff.validators';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await staffService.createStaffAccount(req.body as CreateStaffInput);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await staffService.listStaff();
    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
}
