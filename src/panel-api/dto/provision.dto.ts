import { IsString } from 'class-validator';

export class ProvisionDto {
  @IsString()
  setupCode: string;
}
