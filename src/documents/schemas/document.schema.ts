import * as mongoose from 'mongoose';

export const DocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: false },
    documentUrl: { type: String, required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  },
  { timestamps: true },
);
