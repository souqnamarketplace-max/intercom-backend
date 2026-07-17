import { IsString, IsOptional } from 'class-validator';

export class SendPanelMessageDto {
  @IsString()
  residentId: string;

  @IsString()
  body: string;

  @IsOptional() @IsString()
  photoUrl?: string;
}
