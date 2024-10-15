import * as mongoose from 'mongoose';

export const EventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: false },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    userProperties: { type: mongoose.Schema.Types.Mixed },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: {
      address: { type: String, required: false },
      coordinates: {
        latitude: { type: Number, required: false },
        longitude: { type: Number, required: false },
      },
    },
    styles: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        eventImage:
          'https://ik.imagekit.io/6cx9tc1kx/Escenario_detas_camaras.jpg?updatedAt=1725555281421',
        miniatureImage: '',
      },
    },
  },
  { timestamps: true },
);
