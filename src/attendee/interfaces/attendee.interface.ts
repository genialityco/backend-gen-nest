import { Document, Types } from 'mongoose';

export interface Attendee extends Document {
  eventId: Types.ObjectId;
  userId?: Types.ObjectId;
  memberId?: Types.ObjectId;
  attended: boolean;
  certificationHours?: string;
  typeAttendee?: string;
  certificateDownloads?: number;
}
