import { Document, Types } from 'mongoose';

export interface Speaker extends Document {
  readonly names: string;
  readonly description: string;
  readonly location?: string;
  readonly isInternational: boolean;
  readonly imageUrl: string;
  eventId: Types.ObjectId;
}
