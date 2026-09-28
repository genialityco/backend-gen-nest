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
    scheduledAt: { type: Date, default: null },
    // Si tiene correos, el envío programado va solo a esta lista
    recipientEmails: { type: [String], default: [] },
  },
  { timestamps: true },
);
