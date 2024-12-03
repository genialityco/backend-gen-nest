import { Document, Types } from 'mongoose';

export interface Highlight extends Document {
  readonly name: string;
  readonly organizationId: Types.ObjectId;
  readonly eventId: Types.ObjectId;
  readonly description: string;
  readonly imageUrl: string;
  readonly vimeoUrl: string;
  readonly transcription: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
