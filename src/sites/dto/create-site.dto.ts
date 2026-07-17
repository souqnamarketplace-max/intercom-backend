import { IsString, IsOptional, IsNumber, IsInt, IsBoolean, IsObject } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  ownerId: string;

  @IsString()
  name: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsNumber()
  latitude?: number;

  @IsOptional() @IsNumber()
  longitude?: number;

  @IsOptional() @IsString()
  timezone?: string;

  @IsOptional() @IsBoolean()
  directoryPrivacyMode?: boolean;

  @IsOptional() @IsString()
  brandingLogoUrl?: string;

  @IsOptional() @IsString()
  buildingInfo?: string;

  @IsOptional() @IsString()
  frontDeskResidentId?: string;

  @IsOptional() @IsString()
  frontDeskLabel?: string;

  @IsOptional() @IsObject()
  customButtonLabels?: Record<string, string>;

  @IsOptional() @IsString()
  panelSettingsPin?: string;

  @IsOptional() @IsBoolean()
  securityTileEnabled?: boolean;

  @IsOptional() @IsString()
  screensaverType?: string;

  @IsOptional() @IsString()
  screensaverUrl?: string;

  @IsOptional() @IsInt()
  screensaverDelaySeconds?: number;
}
