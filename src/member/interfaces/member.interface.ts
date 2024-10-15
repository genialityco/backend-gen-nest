import { Document, Types } from 'mongoose';

export interface Member extends Document {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  readonly properties: Record<string, any>;
}
