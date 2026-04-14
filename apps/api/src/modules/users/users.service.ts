import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, mfaEnabled: true, lastLogin: true, active: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, data: { email: string; password: string; firstName?: string; lastName?: string; role?: string }) {
    const existing = await this.prisma.user.findFirst({ where: { tenantId, email: data.email } });
    if (existing) throw new ConflictException('Email already exists in this tenant');

    return this.prisma.user.create({
      data: {
        tenantId,
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 12),
        firstName: data.firstName,
        lastName: data.lastName,
        role: (data.role as any) || 'VIEWER',
      },
      select: { id: true, email: true, role: true, firstName: true, lastName: true },
    });
  }

  async update(tenantId: string, id: string, data: { firstName?: string; lastName?: string; role?: string; active?: boolean }) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({ where: { id }, data: data as any });
  }

  async remove(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id }, data: { active: false } });
    return { deleted: true };
  }
}
