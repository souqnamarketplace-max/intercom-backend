import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ResidentJwtPayload } from './strategies/resident-jwt.strategy';

const OTP_TTL_MINUTES = 10;

@Injectable()
export class ResidentAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Looks a resident up by their admin-issued invite code and generates a
   * fresh OTP. Real SMS/email delivery (Twilio/SendGrid — see spec's
   * third-party integration gaps) isn't wired up yet, so in non-production
   * environments the OTP is returned directly in the response for testing.
   * In production this MUST be replaced with real delivery and the OTP
   * should never appear in an API response.
   */
  async requestOtp(inviteCode: string) {
    const resident = await this.prisma.resident.findUnique({ where: { inviteCode } });
    if (!resident || resident.status !== 'active') {
      throw new NotFoundException('Invalid invite code');
    }

    const otp = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.resident.update({
      where: { id: resident.id },
      data: { otpCode: otp, otpExpiresAt },
    });

    // Real SMS/email delivery (Twilio/SendGrid) isn't wired up yet. Gated by
    // an explicit opt-in var (not NODE_ENV) so a testing deployment can show
    // the OTP without touching NODE_ENV, which has other correct
    // production-only behaviors tied to it. Defaults to hidden/off.
    const showDevOtp = process.env.SHOW_DEV_OTP === 'true';
    return {
      message: `OTP sent${resident.phone ? ' via SMS' : resident.email ? ' via email' : ''}`,
      ...(showDevOtp ? { devOtp: otp } : {}), // ⚠️ testing convenience only — never expose in real production
    };
  }

  async verifyOtp(inviteCode: string, otp: string) {
    const resident = await this.prisma.resident.findUnique({ where: { inviteCode } });
    if (!resident) throw new NotFoundException('Invalid invite code');

    if (!resident.otpCode || resident.otpCode !== otp) {
      throw new UnauthorizedException('Incorrect code');
    }
    if (!resident.otpExpiresAt || resident.otpExpiresAt < new Date()) {
      throw new UnauthorizedException('Code expired, request a new one');
    }

    // OTP is single-use — clear it immediately, and mark the app account as claimed
    await this.prisma.resident.update({
      where: { id: resident.id },
      data: { otpCode: null, otpExpiresAt: null, appAccountCreated: true },
    });

    const unit = await this.prisma.unit.findUnique({ where: { id: resident.unitId } });

    const payload: ResidentJwtPayload = {
      sub: resident.id,
      unitId: resident.unitId,
      siteId: unit!.siteId,
      type: 'resident',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      resident: { id: resident.id, name: resident.name, unitId: resident.unitId },
    };
  }
}
