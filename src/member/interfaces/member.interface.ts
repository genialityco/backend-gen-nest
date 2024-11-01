import { Document, Types } from 'mongoose';

export interface Member extends Document {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  memberActive: boolean;
  readonly properties: Record<string, any>;
}
