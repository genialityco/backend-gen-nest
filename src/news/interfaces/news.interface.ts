import { Document, Types } from 'mongoose';

export interface News extends Document {
  readonly title: string;
  readonly content: string;
  organizationId: Types.ObjectId;
  readonly featuredImage?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
