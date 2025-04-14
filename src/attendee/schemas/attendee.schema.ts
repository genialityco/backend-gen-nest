import * as mongoose from 'mongoose';

export const AttendeeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    attended: { type: Boolean, required: false, default: false },
    certificationHours: { type: String, required: false },
    typeAttendee: { type: String, required: false },
    certificateDownloads: {type: Number, required: false},
  },
  { timestamps: true },
);
