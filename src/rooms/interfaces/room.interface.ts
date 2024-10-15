import { Document, Types } from 'mongoose';

export interface Room extends Document {
  readonly name: string;
  readonly description?: string;
  eventId: Types.ObjectId;
}
