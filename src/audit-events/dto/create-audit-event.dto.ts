import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { AuditEventType } from '@prisma/client';

export class CreateAuditEventDto {
  @IsString()
  siteId: string;

  @IsOptional() @IsString()
  entryPointId?: string;

  @IsOptional() @IsString()
  deviceId?: string;

  @IsOptional() @IsString()
  unitId?: string;

  @IsOptional() @IsString()
  residentId?: string;

  @IsEnum(AuditEventType)
  eventType: AuditEventType;

  @IsOptional() @IsString()
  method?: string;

  @IsString()
  result: string;

  @IsOptional() @IsString()
  photoUrl?: string;

  @IsOptional() @IsObject()
  metadata?: Record<string, any>;
}
