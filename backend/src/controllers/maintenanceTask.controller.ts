import { NextFunction, Request, Response } from 'express';
import * as maintenanceTaskService from '../services/maintenanceTask.service';
import { AppError } from '../utils/AppError';
import {
  AssignTaskInput,
  RevisionTaskInput,
  SubmitTaskInput,
  VerifyTaskInput,
} from '../validators/maintenanceTask.validators';

export async function assign(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await maintenanceTaskService.assignTask(req.body as AssignTaskInput);
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
}

export async function my(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const tasks = await maintenanceTaskService.listMyTasks(req.user.id);
    res.status(200).json({ tasks });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const task = await maintenanceTaskService.getTaskById(req.params.id, req.user);
    res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
}

export async function start(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const task = await maintenanceTaskService.startTask(req.params.id, req.user.id);
    res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
}

export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const task = await maintenanceTaskService.submitTask(
      req.params.id,
      req.user.id,
      req.body as SubmitTaskInput,
      req.file
    );
    res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
}

export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await maintenanceTaskService.verifyTask(req.params.id, req.body as VerifyTaskInput);
    res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
}

export async function revision(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await maintenanceTaskService.requestRevision(
      req.params.id,
      req.body as RevisionTaskInput
    );
    res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
}
