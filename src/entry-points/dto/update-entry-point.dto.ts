import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateEntryPointDto } from './create-entry-point.dto';

export class UpdateEntryPointDto extends PartialType(OmitType(CreateEntryPointDto, ['siteId'] as const)) {}
