import { NextFunction, Request, Response } from 'express';
import * as toiletService from '../services/toilet.service';
import { CreateToiletInput, ListToiletsQuery, NearbyToiletsQuery, UpdateToiletInput } from '../validators/toilet.validators';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.validatedQuery as ListToiletsQuery;
    const result = await toiletService.listToilets(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const toilet = await toiletService.getToiletById(req.params.id);
    res.status(200).json({ toilet });
  } catch (err) {
    next(err);
  }
}

export async function nearby(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.validatedQuery as NearbyToiletsQuery;
    const results = await toiletService.findNearbyToilets(query.lat, query.lng, query.radiusKm);
    res.status(200).json({ toilets: results, count: results.length });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const toilet = await toiletService.createToilet(req.body as CreateToiletInput);
    res.status(201).json({ toilet });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const toilet = await toiletService.updateToilet(req.params.id, req.body as UpdateToiletInput);
    res.status(200).json({ toilet });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await toiletService.deleteToilet(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
