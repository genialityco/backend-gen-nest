import * as mongoose from 'mongoose';

export const CertificateSchema = new mongoose.Schema(
  {
    elements: { type: [mongoose.Schema.Types.Mixed], required: true },
    size: {
      type: {
        width: { type: Number },
        height: { type: Number },
      },
      required: false,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    // Campos dinámicos que se piden en la carga de asistentes de este certificado
    // (además de los datos base del miembro). Ej: [{ key: 'certificationHours', label: 'Horas' }]
    fields: {
      type: [
        {
          _id: false,
          key: { type: String, required: true },
          label: { type: String, required: true },
        },
      ],
      default: undefined,
    },
    // Correo que avisa al asistente que su certificado está listo (bloques
    // editables desde el admin). Ver certificate-admin/certificate-email.template.ts
    emailSettings: { type: mongoose.Schema.Types.Mixed, required: false },
  },
  { timestamps: true },
);
