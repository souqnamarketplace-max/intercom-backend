import { IsString, IsOptional } from 'class-validator';

export class VerifyDoorPinDto {
  @IsString()
  pin: string;

  @IsOptional() @IsString()
  entryPointId?: string;
}
