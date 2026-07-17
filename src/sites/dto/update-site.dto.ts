import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateSiteDto } from './create-site.dto';

// ownerId is immutable after creation — moving a site between owners is not a simple PATCH
export class UpdateSiteDto extends PartialType(OmitType(CreateSiteDto, ['ownerId'] as const)) {}
