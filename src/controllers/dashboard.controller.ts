import type { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';

export async function stats(req: Request, res: Response) {
  const { from, to } = req.query as { from?: string; to?: string };
  res.json({ data: await dashboardService.getStats(from, to) });
}
