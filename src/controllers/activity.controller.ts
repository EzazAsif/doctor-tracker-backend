import type { Request, Response } from 'express';
import * as activityService from '../services/activity.service';
import type { ListActivityQuery } from '../validators/staff.validator';

export async function list(req: Request, res: Response) {
  res.json(await activityService.listActivity(req.query as unknown as ListActivityQuery));
}
