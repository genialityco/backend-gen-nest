import { Document } from 'mongoose';

export interface User extends Document {
  firebaseUid: string;
  expoPushToken?: string;
}
