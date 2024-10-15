import { Schema } from 'mongoose';

export const SpeakerSchema = new Schema(
  {
    names: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: false },
    isInternational: { type: Boolean, required: true },
    imageUrl: { type: String, required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
  },
  { timestamps: true },
);
