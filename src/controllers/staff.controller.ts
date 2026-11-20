import type { Request, Response } from 'express';
import * as activityService from '../services/activity.service';
import * as staffService from '../services/staff.service';
import type { CreateStaffInput } from '../validators/staff.validator';

type IdParams = { id: string };

export async function list(_req: Request, res: Response) {
  res.json({ data: await staffService.listStaff() });
}

export async function create(req: Request, res: Response) {
  const user = await staffService.createStaff(req.body as CreateStaffInput);
  await activityService.recordActivity({
    actor: req.user!, action: 'created', resource: 'user', resourceId: String(user._id), fields: ['name', 'email', 'role'],
  });
  res.status(201).json({ data: user });
}

export async function setActive(req: Request<IdParams>, res: Response) {
  const active = (req.body as { active: boolean }).active;
  const user = await staffService.setStaffActive(req.params.id, active, req.user!);
  await activityService.recordActivity({
    actor: req.user!, action: active ? 'updated' : 'deactivated', resource: 'user', resourceId: req.params.id, fields: ['active'],
  });
  res.json({ data: user });
}
