import * as mongoose from 'mongoose';

export const CertificateSchema = new mongoose.Schema(
  {
    elements: { type: mongoose.Schema.Types.Mixed, required: true },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
  },
  { timestamps: true },
);
