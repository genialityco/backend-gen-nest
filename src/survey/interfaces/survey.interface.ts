import { Document, Types } from 'mongoose';

export interface Question {
  readonly type: 'radio' | 'text' | 'checkbox';
  readonly title: string;
  readonly options?: string[];
}

export interface Survey extends Document {
  readonly title: string;
  readonly questions: Question[];
  readonly isPublished: boolean;
  readonly isOpen: boolean;
  readonly organizationId: Types.ObjectId;
  readonly eventId?: Types.ObjectId;
}
