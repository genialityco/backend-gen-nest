import { Schema } from 'mongoose';

export const UserSchema = new Schema(
  {
    firebaseUid: { type: String, required: true },
  },
  { timestamps: true },
);
