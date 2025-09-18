import { Schema } from 'mongoose';
import { Attendee } from 'src/attendee/interfaces/attendee.interface';
import { Member } from 'src/member/interfaces/member.interface';

export const UserSchema = new Schema(
  {
    firebaseUid: { type: String, required: true },
    expoPushToken: { type: String, required: false },
  },
  { timestamps: true },
);
export interface UserFirebase {
  email: string;
  password: string;
}
export interface addOrCreateAttendee {
  user: UserFirebase;
  attendee: Attendee;
  member: Member
}
