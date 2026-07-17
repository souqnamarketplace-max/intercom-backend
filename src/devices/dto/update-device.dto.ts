import { IsString, IsOptional } from 'class-validator';

// Devices report their own status/heartbeat/firmware — a narrower update surface
// than the other resources, since most fields are set once at provisioning.
export class UpdateDeviceDto {
  @IsOptional() @IsString()
  status?: string;

  @IsOptional() @IsString()
  firmwareVersion?: string;

  @IsOptional() @IsString()
  publicKey?: string;
}
