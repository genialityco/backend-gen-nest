import * as mongoose from 'mongoose';

export const ModuleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    moderator: { type: String },
  },
  { timestamps: true },
);
