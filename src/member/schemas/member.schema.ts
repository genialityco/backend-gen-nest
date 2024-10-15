import { Schema } from 'mongoose';

export const MemberSchema = new Schema(
  {
    userId: { type: String, required: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    memberActive: { type: Boolean, default: false },
    properties: { type: Object, default: {} },
  },
  { timestamps: true },
);
