import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export type TokenPayload = { sub: string; role: string };

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function verifyToken(token: string): TokenPayload & { exp: number } {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as TokenPayload & { exp: number };
}
