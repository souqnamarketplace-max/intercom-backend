import { IsString, IsArray, ArrayNotEmpty, IsIn } from 'class-validator';
import { PARTNER_API_SCOPES } from '../../partner-api/scopes';

export class CreatePartnerApiKeyDto {
  @IsString()
  ownerId: string;

  @IsString()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(PARTNER_API_SCOPES, { each: true })
  scopes: string[];
}
