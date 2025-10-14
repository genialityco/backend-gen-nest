import { Schema } from 'mongoose';

export const NewsSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: false,
    },
    featuredImage: { type: String, required: false },
    documents: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true },
);
