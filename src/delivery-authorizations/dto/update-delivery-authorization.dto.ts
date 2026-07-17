import { IsOptional, IsString, IsObject, IsBoolean } from 'class-validator';

export class UpdateDeliveryAuthorizationDto {
  @IsOptional()
  @IsString()
  carrierName?: string;

  @IsOptional()
  @IsString()
  rawPin?: string;

  @IsOptional()
  @IsObject()
  timeWindow?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
