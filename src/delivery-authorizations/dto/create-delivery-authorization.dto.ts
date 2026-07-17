import { IsString, IsOptional, IsObject } from 'class-validator';

// timeWindow shape (jsonb, intentionally loose here — validated at UI/service
// level, mirrors ButterflyMX's "open all day" vs custom days+times toggle):
//   { openAllDay: true }
//   { openAllDay: false, days: ['mon','tue'], from: '09:00', to: '17:00' }
export class CreateDeliveryAuthorizationDto {
  @IsString()
  siteId: string;

  @IsString()
  carrierName: string;

  @IsString()
  rawPin: string;

  @IsOptional()
  @IsObject()
  timeWindow?: Record<string, any>;
}
