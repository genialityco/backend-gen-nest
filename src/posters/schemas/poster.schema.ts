import { Schema } from 'mongoose';

export const PosterSchema = new Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    topic: { type: String, required: true },
    institution: { type: String, required: true },
    authors: [{ type: String, required: true }],
    votes: { type: Number, default: 0 },
    urlPdf: { type: String, required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: false },
    voters: [{ type: Schema.Types.ObjectId, ref: 'User' }] 
  },
  { timestamps: true },
);

