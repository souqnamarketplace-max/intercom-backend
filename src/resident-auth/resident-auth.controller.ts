import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { ResidentAuthService } from './resident-auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('resident-auth')
export class ResidentAuthController {
  constructor(private service: ResidentAuthService) {}

  @Post('request-otp')
  @HttpCode(200)
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.service.requestOtp(dto.inviteCode);
  }

  @Post('verify-otp')
  @HttpCode(200)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.service.verifyOtp(dto.inviteCode, dto.otp);
  }
}
