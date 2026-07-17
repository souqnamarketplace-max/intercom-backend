import { IsString, IsOptional, IsEnum, IsDateString, IsObject } from 'class-validator';
import { KeyType, KeyAccessMethod } from '@prisma/client';

export class CreateVirtualKeyDto {
  // Required for the staff-facing endpoint (VirtualKeysController), but
  // deliberately optional here: the resident-facing endpoint never accepts
  // these from the client at all — it force-fills them from the resident's
  // own JWT claims, so a resident can't specify someone else's unit/site.
  // NestJS validates the raw request body against this DTO before either
  // controller's logic runs, so marking these required blocked every
  // resident-generated pass at the validation layer before it ever reached
  // the override code.
  @IsOptional() @IsString()
  unitId?: string;

  @IsOptional() @IsString()
  siteId?: string;

  @IsOptional() @IsString()
  issuedByResidentId?: string;

  @IsString()
  recipientName: string;

  @IsOptional() @IsString()
  recipientContact?: string;

  @IsEnum(KeyType)
  keyType: KeyType;

  @IsOptional() @IsEnum(KeyAccessMethod)
  accessMethod?: KeyAccessMethod;

  // Required when accessMethod is 'pin' (Delivery Pass) — a short numeric
  // code the visitor/carrier types on the panel keypad. Hashed like card
  // fobs and delivery-authorization PINs; never stored raw.
  @IsOptional() @IsString()
  rawShortCode?: string;

  // For recurring keys: { daysOfWeek: number[], timeStart: "HH:mm", timeEnd: "HH:mm" }
  @IsOptional() @IsObject()
  schedule?: Record<string, any>;

  // Preset drives what schedule/window gets built server-side — mirrors
  // ButterflyMX's four preset buttons (Custom Duration / Recurring Access /
  // Business Hours / Full-Day Use). 'custom' expects activatesAt+expiresAt;
  // 'recurring' expects schedule.daysOfWeek/timeStart/timeEnd; 'business_hours'
  // and 'full_day' need no extra input — the server fills in the schedule.
  @IsOptional() @IsEnum(['custom', 'recurring', 'business_hours', 'full_day'])
  preset?: 'custom' | 'recurring' | 'business_hours' | 'full_day';

  @IsOptional() @IsDateString()
  activatesAt?: string;

  @IsOptional() @IsDateString()
  expiresAt?: string;
}
