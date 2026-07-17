import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateOwnerDto {
  @IsString()
  name: string;

  @IsOptional() @IsNumber() @Min(0)
  flatFeeAmount?: number;

  @IsOptional() @IsNumber() @Min(0)
  perSiteRate?: number;

  @IsOptional() @IsNumber() @Min(0)
  perUnitRate?: number;

  @IsOptional() @IsNumber() @Min(0)
  perResidentRate?: number;

  @IsOptional() @IsString()
  billingCycle?: string;

  @IsOptional() @IsString()
  currency?: string;

  @IsOptional() @IsBoolean()
  demoMode?: boolean;
}
