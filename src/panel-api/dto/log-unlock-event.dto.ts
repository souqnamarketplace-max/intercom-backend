import { IsString, IsOptional } from 'class-validator';

export class LogUnlockEventDto {
  @IsString()
  entryPointId: string;

  @IsOptional() @IsString()
  unitId?: string;

  @IsOptional() @IsString()
  method?: string;
}
