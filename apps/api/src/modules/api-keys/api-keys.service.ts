import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes, createHash } from 'node:crypto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { user: { tenantId } },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      permissions: Array.isArray(k.permissions) ? k.permissions : [],
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      active: k.active,
      expiresAt: k.expiresAt,
      ownerEmail: k.user?.email,
    }));
  }

  async create(userId: string, tenantId: string, data: { name: string; permissions: string[]; expiresAt?: Date }) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new ForbiddenException();

    const raw = `nb_live_${randomBytes(28).toString('base64url')}`;
    const keyHash = createHash('sha256').update(raw).digest('hex');
    const keyPrefix = raw.slice(0, 12);

    const created = await this.prisma.apiKey.create({
      data: {
        userId,
        name: data.name,
        keyHash,
        keyPrefix,
        permissions: data.permissions,
        expiresAt: data.expiresAt,
      },
    });

    return {
      id: created.id,
      name: created.name,
      key: raw, // plaintext returned ONCE
      keyPrefix,
      createdAt: created.createdAt,
    };
  }

  async revoke(tenantId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, user: { tenantId } } });
    if (!key) throw new NotFoundException('API key not found');
    await this.prisma.apiKey.update({ where: { id }, data: { active: false } });
  }

  async rename(tenantId: string, id: string, newName: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, user: { tenantId } } });
    if (!key) throw new NotFoundException('API key not found');
    await this.prisma.apiKey.update({ where: { id }, data: { name: newName } });
    return { ok: true };
  }
}
