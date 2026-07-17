import { IsString } from 'class-validator';

export class ChangeSettingsPinDto {
  @IsString()
  currentPin: string;

  @IsString()
  newPin: string;
}
