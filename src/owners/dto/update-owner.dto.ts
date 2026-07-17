import { PartialType } from '@nestjs/mapped-types';
import { CreateOwnerDto } from './create-owner.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateOwnerDto extends PartialType(CreateOwnerDto) {
  @IsOptional() @IsString()
  subscriptionStatus?: string;
}
