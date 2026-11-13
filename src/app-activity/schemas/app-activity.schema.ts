import { Schema } from 'mongoose';

/**
 * Un documento por usuario y por dia (hora de Bogota) en que abrio la app.
 * `isNew` y `gapDays` se calculan al crear el dia, a partir de AppActivityState,
 * para que las estadisticas sean una simple agregacion.
 */
export const AppActivityDaySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    day: { type: String, required: true }, // YYYY-MM-DD en America/Bogota
    isNew: { type: Boolean, default: false }, // primer acceso conocido de la persona
    prevDay: { type: String, default: null }, // dia del acceso anterior
    gapDays: { type: Number, default: null }, // dias desde el acceso anterior
    opens: { type: Number, default: 0 },
    firstAt: { type: Date },
    lastAt: { type: Date },
  },
  { collection: 'appactivitydays', versionKey: false },
);
AppActivityDaySchema.index({ userId: 1, day: 1 }, { unique: true });
AppActivityDaySchema.index({ day: 1 });

/**
 * Ultimo acceso conocido de cada usuario. Los documentos con `seeded: true`
 * vienen de Firebase (ultimo acceso antes de empezar a registrar), para poder
 * detectar desde el primer dia a quien vuelve despues de meses sin entrar.
 */
export const AppActivityStateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    firstDay: { type: String, default: null },
    lastDay: { type: String, default: null },
    lastAt: { type: Date },
    seeded: { type: Boolean, default: false },
  },
  { collection: 'appactivitystates', versionKey: false },
);
