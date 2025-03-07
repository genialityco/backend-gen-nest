import { Schema } from 'mongoose';

export const UserSchema = new Schema(
  {
    firebaseUid: { type: String, required: true },
    expoPushToken: { type: String, required: false },
  },
  { timestamps: true },
);
