import { IsString } from 'class-validator';

export class ResolveSiteCodeDto {
  @IsString()
  code: string;
}
