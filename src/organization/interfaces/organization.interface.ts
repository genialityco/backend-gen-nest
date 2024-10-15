import { Document } from 'mongoose';

export interface Organization extends Document {
  name: string;
  readonly propertiesDefinition?: any;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
