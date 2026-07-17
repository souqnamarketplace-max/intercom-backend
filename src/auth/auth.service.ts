import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  ownerId: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateStaff(email: string, password: string) {
    const staff = await this.prisma.staffAccount.findUnique({ where: { email } });
    if (!staff) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(password, staff.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials');

    return staff;
  }

  async login(email: string, password: string) {
    const staff = await this.validateStaff(email, password);

    const payload: JwtPayload = {
      sub: staff.id,
      email: staff.email,
      role: staff.role,
      ownerId: staff.ownerId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      staff: {
        id: staff.id,
        email: staff.email,
        role: staff.role,
        ownerId: staff.ownerId,
      },
    };
  }

  // Used by seed scripts / owner-provisioning flows — never exposed directly over the API
  // without a platform_admin check in the calling controller.
  async hashPassword(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, 12);
  }

  // Requires the caller to prove they know the CURRENT password before
  // setting a new one — this is a self-service change, not an admin reset.
  async changePassword(staffId: string, currentPassword: string, newPassword: string) {
    const staff = await this.prisma.staffAccount.findUnique({ where: { id: staffId } });
    if (!staff) throw new UnauthorizedException('Account not found');

    const currentMatches = await bcrypt.compare(currentPassword, staff.passwordHash);
    if (!currentMatches) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.staffAccount.update({ where: { id: staffId }, data: { passwordHash } });
    return { success: true };
  }
}
