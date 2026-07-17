import { IsString } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  inviteCode: string;
}
