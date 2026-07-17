import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResidentAuthService } from './resident-auth.service';
import { ResidentAuthController } from './resident-auth.controller';
import { ResidentJwtStrategy } from './strategies/resident-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' }, // residents stay logged in much longer than staff
      }),
    }),
  ],
  controllers: [ResidentAuthController],
  providers: [ResidentAuthService, ResidentJwtStrategy],
})
export class ResidentAuthModule {}
