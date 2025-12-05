import { Document, Types } from 'mongoose';

export interface EventInterface extends Document {
  readonly name: string;
  readonly description?: string;
  readonly type?: string;
  organizationId?: Types.ObjectId;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly location?: {
    address?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  readonly styles?: Record<string, any>;
  readonly eventSections?: Record<string, boolean>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly price?: number;
  readonly isExternalRegistration: boolean;
  readonly externalRegistrationUrl: string;
}
