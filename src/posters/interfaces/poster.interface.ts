// poster.interface.ts
import { Document, Types } from 'mongoose';

export interface Poster extends Document {
  readonly title: string;
  readonly category: string;
  readonly topic: string;
  readonly institution: string;
  readonly authors: string[];
  votes: number;
  readonly urlPdf: string;
  eventId: Types.ObjectId;
  voters: Types.ObjectId[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
