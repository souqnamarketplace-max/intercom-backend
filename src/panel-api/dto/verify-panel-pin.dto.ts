import { IsString } from 'class-validator';

export class VerifyPanelPinDto {
  @IsString()
  pin: string;
}
