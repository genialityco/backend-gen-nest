import { Schema } from 'mongoose';

const QuestionSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, required: true, enum: ['radio', 'text', 'checkbox'] },
  title: { type: String, required: true },
  options: [{ type: String }],
});

export const SurveySchema = new Schema(
  {
    title: { type: String, required: true },
    questions: { type: [QuestionSchema], required: true },
    isPublished: { type: Boolean, default: false },
    isOpen: { type: Boolean, default: false },
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
    },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
  },
  { timestamps: true },
);
