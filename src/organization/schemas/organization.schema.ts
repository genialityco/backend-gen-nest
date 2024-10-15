import * as mongoose from 'mongoose';

export const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    propertiesDefinition: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);
