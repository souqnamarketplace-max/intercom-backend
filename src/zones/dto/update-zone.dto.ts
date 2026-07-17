import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateZoneDto } from './create-zone.dto';

export class UpdateZoneDto extends PartialType(OmitType(CreateZoneDto, ['siteId'] as const)) {}
