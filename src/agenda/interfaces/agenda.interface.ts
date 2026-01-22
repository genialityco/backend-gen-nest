import { Types } from 'mongoose';

export interface Agenda {
  eventId: Types.ObjectId;
  sessions: {
    title: string;
    startDateTime: Date;
    endDateTime: Date;
    speakers: Types.ObjectId[];
    module?: Types.ObjectId;
    room?: string;
    typeSession?: string;
    subSessions?: {
      title: string;
      startDateTime: Date;
      endDateTime: Date;
      speakers?: Types.ObjectId[];
      module?: Types.ObjectId;
      room?: string;
    }[];
  }[];
}
