import { IsOptional, IsEmail, IsString, IsBoolean } from 'class-validator';

export class UpdateSelfDto {
  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsBoolean()
  notificationsEnabled?: boolean;
}
