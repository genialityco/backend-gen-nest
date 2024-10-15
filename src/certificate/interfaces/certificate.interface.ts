import { Document, Types } from 'mongoose';

export interface Certificate extends Document {
  readonly elements: Record<string, any>;
  eventId: Types.ObjectId;
  readonly createdAt: Date;
}
