import * as mongoose from 'mongoose';

export const RoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: false },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  },
  { timestamps: true },
);
