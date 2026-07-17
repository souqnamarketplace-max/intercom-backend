import { IsString, IsOptional } from 'class-validator';

export class VerifyPinDto {
  @IsString()
  pin: string;

  @IsOptional() @IsString()
  entryPointId?: string;
}
