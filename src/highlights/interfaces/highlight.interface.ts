import { Document, Types } from 'mongoose';

export interface ProviderUrl {
  readonly provider: string;
  readonly url: string;
  readonly meta?: Record<string, any>;
}

export interface Highlight extends Document {
  readonly name: string;
  readonly organizationId: Types.ObjectId;
  readonly eventId: Types.ObjectId;
  readonly description: string;
  readonly imageUrl: string;
  readonly vimeoUrl: string;
  readonly transcription: string;
  readonly providerUrls?: ProviderUrl[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  // Resueltos en tiempo de lectura (findOne): no se persisten en la coleccion.
  videoUrl?: string | null;
  videoProvider?: string | null;
}
