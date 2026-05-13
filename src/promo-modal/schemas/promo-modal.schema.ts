import { Schema } from 'mongoose';

export const PromoModalSchema = new Schema(
  {
    isActive: { type: Boolean, default: false },
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
    imageUri: { type: String, default: '' },
    videoUri: { type: String, default: '' },
    ctaUrl: { type: String, default: '' },
    showButton: { type: Boolean, default: false },
    imageOnPressUrl: { type: String, default: '' },
  },
  { timestamps: true },
);
