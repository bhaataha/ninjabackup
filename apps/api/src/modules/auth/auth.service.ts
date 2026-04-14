import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';

export interface JwtPayload {
  sub: string;       // userId
  tenantId: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if tenant slug is taken
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (existingTenant) {
      throw new ConflictException('Tenant slug already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create organization + tenant + owner user in one transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName,
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          organizationId: org.id,
          name: dto.tenantName,
          slug: dto.tenantSlug,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'OWNER',
        },
      });

      return { org, tenant, user };
    });

    const tokens = await this.generateTokens(result.user);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, active: true },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // If MFA is enabled, require MFA code
    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        return { requiresMfa: true, tempToken: await this.generateTempMfaToken(user.id) };
      }

      const isValid = authenticator.verify({ token: dto.mfaCode, secret: user.mfaSecret! });
      if (!isValid) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
      },
      ...tokens,
    };
  }

  async verifyMfa(dto: VerifyMfaDto) {
    // Decode temp token to get user ID
    const payload = this.jwt.verify(dto.tempToken, {
      secret: this.config.get('JWT_SECRET', 'ninjabackup-dev-secret-change-me'),
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });

    if (!user || !user.mfaSecret) {
      throw new UnauthorizedException('Invalid token');
    }

    const isValid = authenticator.verify({ token: dto.mfaCode, secret: user.mfaSecret });
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', 'ninjabackup-refresh-change-me'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub, active: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async setupMfa(userId: string) {
    const secret = authenticator.generateSecret();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const otpauth = authenticator.keyuri(user.email, 'NinjaBackup', secret);

    // Store secret temporarily (will be confirmed when user provides first valid code)
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    return { secret, otpauthUrl: otpauth };
  }

  async confirmMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw new UnauthorizedException();

    const isValid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!isValid) throw new UnauthorizedException('Invalid MFA code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    return { mfaEnabled: true };
  }

  private async generateTokens(user: { id: string; tenantId: string; email: string; role: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET', 'ninjabackup-refresh-change-me'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async generateTempMfaToken(userId: string) {
    return this.jwt.signAsync(
      { sub: userId, type: 'mfa-temp' },
      { expiresIn: '5m' },
    );
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, active: true },
    });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Generate a reset token (valid for 1 hour)
    const resetToken = await this.jwt.signAsync(
      { sub: user.id, type: 'password-reset' },
      { expiresIn: '1h' },
    );

    // TODO: Send email via NotificationsService
    // For now, log the token (in production, this would send an email)
    console.log(`[Password Reset] Token for ${email}: ${resetToken}`);
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get('JWT_SECRET', 'ninjabackup-dev-secret-change-me'),
      });

      if (payload.type !== 'password-reset') {
        throw new UnauthorizedException('Invalid reset token');
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { passwordHash },
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }
}
