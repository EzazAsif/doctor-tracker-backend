import { ActivityModel } from '../models/Activity';
import type { AuthUser } from '../types/express';
import { pageMeta, paginate } from '../utils/query';
import type { ListActivityQuery } from '../validators/staff.validator';

type ActivityInput = {
  actor: AuthUser;
  action: 'created' | 'updated' | 'deleted' | 'imported' | 'deactivated';
  resource: 'doctor' | 'patient' | 'user';
  resourceId: string;
  fields?: string[];
  importedCount?: number;
  failedCount?: number;
  relatedCount?: number;
};

export function recordActivity(input: ActivityInput) {
  const { actor, ...event } = input;
  return ActivityModel.create({
    ...event,
    actor: actor._id,
    actorRole: actor.role,
  });
}

export async function listActivity(query: ListActivityQuery) {
  const filter = {
    ...(query.resource ? { resource: query.resource } : {}),
    ...(query.action ? { action: query.action } : {}),
  };
  const { skip, limit } = paginate(query.page, query.limit);
  const [data, total] = await Promise.all([
    ActivityModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'actor', select: 'name role' })
      .lean(),
    ActivityModel.countDocuments(filter),
  ]);
  return { data, meta: pageMeta(query.page, query.limit, total) };
}
