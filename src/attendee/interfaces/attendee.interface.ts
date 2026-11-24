import { Document, Types } from 'mongoose';

export interface Attendee extends Document {
  eventId: Types.ObjectId;
  userId?: Types.ObjectId;
  memberId?: Types.ObjectId;
  attended: boolean;
  certificationHours?: string;
  typeAttendee?: string;
  certificateDownloads?: number;
  properties?: Record<string, any>;
  certificateEmail?: {
    status?: 'sent' | 'failed';
    sentAt?: Date;
    failedAt?: Date;
    to?: string;
    error?: string;
    count?: number;
  };
}
