import { Schema } from 'mongoose';

export const HighlightSchema = new Schema(
  {
    name: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    vimeoUrl: { type: String, required: true },
    transcription: { type: String, required: true}
  },
  { timestamps: true },
);
