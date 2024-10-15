// src/attendee/dto/update-attendee.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateAttendeeDto } from './create-attendee.dto';

export class UpdateAttendeeDto extends PartialType(CreateAttendeeDto) {}
