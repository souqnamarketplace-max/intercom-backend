import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { DeviceType, DeviceConnection } from '@prisma/client';

export class CreateDeviceDto {
  @IsString()
  entryPointId: string;

  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @IsString()
  serialNumber: string;

  @IsOptional() @IsString()
  publicKey?: string;

  @IsOptional() @IsEnum(DeviceConnection)
  connectionType?: DeviceConnection;

  @IsOptional() @IsBoolean()
  failoverEnabled?: boolean;
}
