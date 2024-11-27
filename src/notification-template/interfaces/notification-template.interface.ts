import { Document, Types } from 'mongoose';

export interface NotificationTemplate extends Document {
  organizationId: Types.ObjectId;
  title: string;
  body: string;
  data: Record<string, any>;
  isSent: boolean;
  totalSent: number;
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
}
