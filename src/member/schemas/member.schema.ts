import { Schema } from 'mongoose';

export const MemberSchema = new Schema(
  {
    userId: { type: String, required: false },
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
