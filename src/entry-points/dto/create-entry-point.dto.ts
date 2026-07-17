import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateEntryPointDto {
  @IsString()
  siteId: string;

  @IsString()
  name: string;

  @IsOptional() @IsArray()
  customButtons?: Record<string, any>[];

  // Shared spaces (parking, mail room) that every resident should reach
  // regardless of zone — skips needing a ZoneEntryPoint row per zone.
  @IsOptional() @IsBoolean()
  openToAllZones?: boolean;
}
