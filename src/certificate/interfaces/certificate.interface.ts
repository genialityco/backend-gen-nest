import { Document, Types } from 'mongoose';

export interface Certificate extends Document {
  readonly elements: Record<string, any>[];
  eventId: Types.ObjectId;
  size?: { width: number; height: number };
  fields?: { key: string; label: string }[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
