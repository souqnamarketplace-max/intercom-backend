import { IsString, IsEnum } from 'class-validator';

export class LogCallEventDto {
  @IsString()
  residentId: string;

  @IsEnum(['call_answered', 'call_missed', 'call_declined'])
  eventType: 'call_answered' | 'call_missed' | 'call_declined';
}
