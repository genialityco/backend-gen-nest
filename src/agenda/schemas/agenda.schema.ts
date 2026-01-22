import * as mongoose from 'mongoose';

export const AgendaSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    sessions: [
      {
        title: { type: String, required: true },
        startDateTime: { type: Date, required: true },
        endDateTime: { type: Date, required: true },
        speakers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Speaker' }],
        moduleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Module',
          required: false,
        },
        room: { type: String, required: false },
        typeSession: { type: String, required: false },
        subSessions: [
          {
            title: { type: String, required: true },
            startDateTime: { type: Date, required: true },
            endDateTime: { type: Date, required: true },
            speakers: [
              { type: mongoose.Schema.Types.ObjectId, ref: 'Speaker' },
            ],
            moduleId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Module',
              required: false,
            },
            room: { type: String, required: false },
          },
        ],
      },
    ],
  },
  { timestamps: true },
);
