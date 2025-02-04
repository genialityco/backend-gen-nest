import * as mongoose from 'mongoose';

export const CertificateSchema = new mongoose.Schema(
  {
    elements: { type: [mongoose.Schema.Types.Mixed], required: true },
    size: {
      type: {
        width: { type: Number },
        height: { type: Number },
      },
      required: false,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
  },
  { timestamps: true },
);
