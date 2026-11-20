import { Schema, model, type InferSchemaType } from 'mongoose';

const activitySchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, enum: ['admin', 'doctor'], required: true },
    action: { type: String, enum: ['created', 'updated', 'deleted', 'imported', 'deactivated'], required: true },
    resource: { type: String, enum: ['doctor', 'patient', 'user'], required: true },
    resourceId: { type: String, required: true, maxlength: 64 },
    fields: [{ type: String, maxlength: 40 }],
    importedCount: { type: Number, min: 0 },
    failedCount: { type: Number, min: 0 },
    relatedCount: { type: Number, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

activitySchema.index({ createdAt: -1, _id: -1 });
activitySchema.index({ resource: 1, createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });

export type Activity = InferSchemaType<typeof activitySchema>;
export const ActivityModel = model('Activity', activitySchema);
