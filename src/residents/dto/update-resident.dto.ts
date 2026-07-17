import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateResidentDto } from './create-resident.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateResidentDto extends PartialType(OmitType(CreateResidentDto, ['unitId'] as const)) {
  @IsOptional() @IsBoolean()
  directoryVisible?: boolean;

  @IsOptional() @IsBoolean()
  notificationsEnabled?: boolean; // personal ring-group opt-out, self-service
}
