import { IsString } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  siteId: string;

  @IsString()
  name: string;
}
