import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JWT } from 'google-auth-library';
import { Model, Types } from 'mongoose';

const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000; // Colombia no tiene horario de verano
const DAY_MS = 24 * 60 * 60 * 1000;
export const RETURNING_GAP_DAYS = 90; // "volvio despues de 3 meses"
const REALTIME_CACHE_MS = 60 * 1000;

export const bogotaDay = (date: Date) =>
  new Date(date.getTime() + BOGOTA_OFFSET_MS).toISOString().slice(0, 10);

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

const isDay = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

type RealtimeResult = {
  available: boolean;
  error?: string;
  activeUsers: number;
  byPlatform: { platform: string; activeUsers: number }[];
  byMinute: { minutesAgo: number; activeUsers: number }[];
  fetchedAt: string;
};

@Injectable()
export class AppActivityService {
  private readonly logger = new Logger(AppActivityService.name);
  private gaClient: JWT | null = null;
  private realtimeCache: RealtimeResult | null = null;

  constructor(
    @InjectModel('AppActivityDay') private readonly dayModel: Model<any>,
    @InjectModel('AppActivityState') private readonly stateModel: Model<any>,
  ) {}

  /** Registra que el usuario abrio la app. Nunca lanza: no debe romper el login. */
  async record(userId: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(userId)) return;
      const uid = new Types.ObjectId(userId);
      const now = new Date();
      const today = bogotaDay(now);

      // Devuelve el estado ANTERIOR (o null si es la primera vez)
      const prev = await this.stateModel
        .findOneAndUpdate(
          { userId: uid },
          { $set: { lastDay: today, lastAt: now }, $setOnInsert: { firstDay: today } },
          { upsert: true, new: false },
        )
        .lean<any>();

      if (prev?.lastDay === today) {
        await this.dayModel.updateOne(
          { userId: uid, day: today },
          { $inc: { opens: 1 }, $set: { lastAt: now }, $setOnInsert: { firstAt: now } },
          { upsert: true },
        );
        return;
      }

      const prevDay: string | null = prev?.lastDay ?? null;
      await this.dayModel.updateOne(
        { userId: uid, day: today },
        {
          $inc: { opens: 1 },
          $set: { lastAt: now },
          $setOnInsert: {
            firstAt: now,
            isNew: !prev,
            prevDay,
            gapDays: prevDay ? daysBetween(prevDay, today) : null,
          },
        },
        { upsert: true },
      );
    } catch (error) {
      this.logger.warn(`No se pudo registrar la actividad de ${userId}: ${error}`);
    }
  }

  /** Activos, nuevos y que volvieron tras 90+ dias, por dia, entre from y to (inclusive). */
  async stats(from?: string, to?: string) {
    const today = bogotaDay(new Date());
    const end = isDay(to) ? to : today;
    const start = isDay(from) ? from : bogotaDay(new Date(Date.parse(end) - 29 * DAY_MS));
    const match = { day: { $gte: start, $lte: end } };

    const [perDay, totals, firstRecord] = await Promise.all([
      this.dayModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$day',
            active: { $sum: 1 },
            newUsers: { $sum: { $cond: ['$isNew', 1, 0] } },
            returning: {
              $sum: { $cond: [{ $gte: ['$gapDays', RETURNING_GAP_DAYS] }, 1, 0] },
            },
            opens: { $sum: '$opens' },
          },
        },
      ]),
      this.dayModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$userId',
            isNew: { $max: { $cond: ['$isNew', 1, 0] } },
            returning: {
              $max: { $cond: [{ $gte: ['$gapDays', RETURNING_GAP_DAYS] }, 1, 0] },
            },
          },
        },
        {
          $group: {
            _id: null,
            uniqueUsers: { $sum: 1 },
            newUsers: { $sum: '$isNew' },
            returning: { $sum: '$returning' },
          },
        },
      ]),
      this.dayModel.findOne({}, { day: 1 }).sort({ day: 1 }).lean<any>(),
    ]);

    const byDay = new Map(perDay.map((d) => [d._id, d]));
    const days: { day: string; active: number; newUsers: number; returning: number; opens: number }[] = [];
    for (let t = Date.parse(start); t <= Date.parse(end); t += DAY_MS) {
      const day = new Date(t).toISOString().slice(0, 10);
      const d = byDay.get(day);
      days.push({
        day,
        active: d?.active ?? 0,
        newUsers: d?.newUsers ?? 0,
        returning: d?.returning ?? 0,
        opens: d?.opens ?? 0,
      });
    }

    return {
      from: start,
      to: end,
      returningGapDays: RETURNING_GAP_DAYS,
      trackingSince: firstRecord?.day ?? null,
      totals: {
        uniqueUsers: totals[0]?.uniqueUsers ?? 0,
        newUsers: totals[0]?.newUsers ?? 0,
        returning: totals[0]?.returning ?? 0,
      },
      days,
    };
  }

  /** Usuarios activos en los ultimos 30 minutos segun Google Analytics 4 (tiempo real). */
  async realtime(): Promise<RealtimeResult> {
    if (this.realtimeCache && Date.now() - Date.parse(this.realtimeCache.fetchedAt) < REALTIME_CACHE_MS) {
      return this.realtimeCache;
    }
    // Propiedad GA4 de la app ACHO (Firebase global-auth-49737); se puede sobrescribir por env
    const propertyId = (process.env.GA4_PROPERTY_ID || '461254897').replace(/\r/g, '').trim();
    const empty = { activeUsers: 0, byPlatform: [], byMinute: [], fetchedAt: new Date().toISOString() };
    if (!propertyId) return { available: false, error: 'Falta GA4_PROPERTY_ID en el backend', ...empty };

    try {
      const client = this.getGaClient();
      const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`;
      const run = (body: object) =>
        client.request<any>({ url, method: 'POST', data: body }).then((r) => r.data);

      const [platform, minutes] = await Promise.all([
        run({ dimensions: [{ name: 'platform' }], metrics: [{ name: 'activeUsers' }] }),
        run({ dimensions: [{ name: 'minutesAgo' }], metrics: [{ name: 'activeUsers' }] }),
      ]);

      const rows = (r: any) =>
        (r.rows ?? []).map((row: any) => ({
          key: row.dimensionValues[0].value as string,
          value: Number(row.metricValues[0].value) || 0,
        }));

      const byPlatform = rows(platform).map((r) => ({ platform: r.key, activeUsers: r.value }));
      const minuteMap = new Map<number, number>(rows(minutes).map((r) => [Number(r.key), r.value]));
      const byMinute = Array.from({ length: 30 }, (_, i) => ({
        minutesAgo: i,
        activeUsers: minuteMap.get(i) ?? 0,
      }));

      this.realtimeCache = {
        available: true,
        // El total sin dimensiones lo trae GA4 en `totals` solo si se pide; la suma por
        // plataforma es exacta porque cada usuario usa una sola plataforma por sesion.
        activeUsers: byPlatform.reduce((sum, p) => sum + p.activeUsers, 0),
        byPlatform,
        byMinute,
        fetchedAt: new Date().toISOString(),
      };
      return this.realtimeCache;
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        status === 403
          ? 'La cuenta de servicio del backend no tiene acceso a la propiedad de GA4'
          : error?.response?.data?.error?.message || String(error);
      this.logger.warn(`GA4 realtime: ${message}`);
      return { available: false, error: message, ...empty };
    }
  }

  private getGaClient() {
    if (!this.gaClient) {
      const clean = (k: string) => (process.env[k] || '').replace(/\r/g, '').trim();
      this.gaClient = new JWT({
        email: clean('FIREBASE_CLIENT_EMAIL'),
        key: clean('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      });
    }
    return this.gaClient;
  }
}
