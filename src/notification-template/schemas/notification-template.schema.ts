import { Schema } from 'mongoose';

export const NotificationTemplateSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Object, default: {} },
    isSent: { type: Boolean, default: false },
    totalSent: { type: Number, default: 0 },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);
