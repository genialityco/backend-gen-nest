import { Schema } from 'mongoose';

export const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Object, default: {} },
    isRead: { type: Boolean, default: false },
    iconUrl: { type: String, default: '' },
  },
  { timestamps: true },
);
