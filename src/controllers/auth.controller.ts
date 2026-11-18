import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env';
import * as authService from '../services/auth.service';
import type { LoginInput } from '../validators/auth.validator';

const COOKIE_NAME = 'token';

const baseCookie: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd,
  path: '/',
};

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as LoginInput;
  const { user, token, expiresAt } = await authService.login(email, password);

  res.cookie(COOKIE_NAME, token, { ...baseCookie, expires: expiresAt });
  res.json({ data: { user } });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, baseCookie);
  res.json({ data: { ok: true } });
}

export async function me(req: Request, res: Response) {
  res.json({ data: { user: authService.toPublicUser(req.user!) } });
}
