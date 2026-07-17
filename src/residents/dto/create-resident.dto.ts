import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateResidentDto {
  @IsString()
  unitId: string;

  @IsString()
  name: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  phone?: string;
}
