import { Document, Types } from 'mongoose';

export interface DocumentInterface extends Document {
  readonly name: string;
  readonly description?: string;
  eventId: Types.ObjectId;
  readonly documentUrl: string;
}
