import { IsString } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  siteId: string;

  @IsString()
  unitNumber: string;
}
