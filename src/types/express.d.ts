import type { Types } from 'mongoose';

export type AuthUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: 'admin';
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
