import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true },
    // need .select('+password') to get it
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'doctor'], default: 'admin' },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: function (this: { role?: string }) { return this.role === 'doctor'; },
    },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password;
        return ret;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ doctor: 1 }, { unique: true, partialFilterExpression: { doctor: { $exists: true } } });

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;
export type UserRole = 'admin' | 'doctor';
export const UserModel = model('User', userSchema);
