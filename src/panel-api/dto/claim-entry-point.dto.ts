import { IsString, IsEnum } from 'class-validator';

export class ClaimEntryPointDto {
  @IsString()
  siteId: string;

  @IsString()
  entryPointId: string;

  @IsEnum(['panel', 'pi_controller'])
  deviceType: 'panel' | 'pi_controller';
}
