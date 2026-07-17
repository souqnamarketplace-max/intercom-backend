import { IsString, IsOptional } from 'class-validator';

export class CreateCardFobDto {
  @IsString()
  siteId: string;

  @IsOptional() @IsString()
  residentId?: string; // nullable — supports shared/unassigned fobs (e.g. maintenance)

  @IsOptional() @IsString()
  label?: string;

  @IsString()
  rawCardId: string; // hashed server-side before storage, never persisted as plaintext
}
