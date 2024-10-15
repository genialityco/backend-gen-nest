import { Document, Types } from 'mongoose';

export interface Module extends Document {
  readonly title: string;
  eventId: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  readonly moderator?: string;
}
