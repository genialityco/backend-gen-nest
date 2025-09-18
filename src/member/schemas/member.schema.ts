import { Schema } from 'mongoose';

export const MemberSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId, 
      ref: 'User',
      required: false,
    },
    
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    memberActive: { type: Boolean, default: true },
    properties: { type: Object, default: {} },
  },
  { timestamps: true },
);
