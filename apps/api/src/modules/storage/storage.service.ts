import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStorageVaultDto } from './dto/create-storage-vault.dto';
import { UpdateStorageVaultDto } from './dto/update-storage-vault.dto';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    // 32-byte hex key for AES-256 server-side credential encryption
    const keyHex = this.config.get<string>(
      'ENCRYPTION_KEY',
      '00000000000000000000000000000000',
    );
    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }

  async create(tenantId: string, dto: CreateStorageVaultDto) {
    const data: any = {
      tenantId,
      name: dto.name,
      type: dto.type,
      endpoint: dto.endpoint,
      region: dto.region,
      bucket: dto.bucket,
      prefix: dto.prefix,
      immutableEnabled: dto.immutableEnabled,
      versioningEnabled: dto.versioningEnabled ?? true,
      lifecycleHotDays: dto.lifecycleHotDays ?? 30,
      lifecycleWarmDays: dto.lifecycleWarmDays ?? 90,
    };

    // Encrypt credentials before storing
    if (dto.accessKey) {
      data.accessKeyEncrypted = this.encrypt(dto.accessKey);
    }
    if (dto.secretKey) {
      data.secretKeyEncrypted = this.encrypt(dto.secretKey);
    }

    return this.prisma.storageVault.create({ data });
  }

  async findAll(tenantId: string) {
    const vaults = await this.prisma.storageVault.findMany({
      where: { tenantId, active: true },
      orderBy: { createdAt: 'desc' },
    });

    // Mask credentials in response
    return vaults.map((v) => ({
      ...v,
      accessKeyEncrypted: v.accessKeyEncrypted ? '****' : null,
      secretKeyEncrypted: v.secretKeyEncrypted ? '****' : null,
      usedBytes: v.usedBytes.toString(),
    }));
  }

  async findOne(tenantId: string, id: string) {
    const vault = await this.prisma.storageVault.findFirst({
      where: { id, tenantId },
    });
    if (!vault) throw new NotFoundException('Storage vault not found');

    return {
      ...vault,
      accessKeyEncrypted: vault.accessKeyEncrypted ? '****' : null,
      secretKeyEncrypted: vault.secretKeyEncrypted ? '****' : null,
      usedBytes: vault.usedBytes.toString(),
    };
  }

  async update(tenantId: string, id: string, dto: UpdateStorageVaultDto) {
    const vault = await this.prisma.storageVault.findFirst({
      where: { id, tenantId },
    });
    if (!vault) throw new NotFoundException('Storage vault not found');

    const data: any = { ...dto };
    if (dto.accessKey) {
      data.accessKeyEncrypted = this.encrypt(dto.accessKey);
      delete data.accessKey;
    }
    if (dto.secretKey) {
      data.secretKeyEncrypted = this.encrypt(dto.secretKey);
      delete data.secretKey;
    }

    return this.prisma.storageVault.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    const vault = await this.prisma.storageVault.findFirst({
      where: { id, tenantId },
    });
    if (!vault) throw new NotFoundException('Storage vault not found');

    await this.prisma.storageVault.update({
      where: { id },
      data: { active: false },
    });
    return { deleted: true };
  }

  async testConnection(tenantId: string, id: string) {
    const vault = await this.prisma.storageVault.findFirst({
      where: { id, tenantId },
    });
    if (!vault) throw new NotFoundException('Storage vault not found');

    const { accessKey, secretKey } = this.getDecryptedCredentials(vault);
    if (!accessKey || !secretKey) {
      return { success: false, message: 'Credentials not configured' };
    }
    if (!vault.bucket) {
      return { success: false, message: 'Bucket not configured' };
    }

    const client = new S3Client({
      region: vault.region || 'us-east-1',
      endpoint: vault.endpoint || undefined,
      // path-style addressing is required for MinIO and most non-AWS S3 providers
      forcePathStyle: vault.type !== 'S3',
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });

    const start = Date.now();
    try {
      await client.send(new HeadBucketCommand({ Bucket: vault.bucket }));
      const latencyMs = Date.now() - start;

      await this.prisma.storageVault.update({
        where: { id: vault.id },
        data: { lastCheckedAt: new Date() },
      });

      return { success: true, message: 'Connection test passed', latencyMs };
    } catch (err: any) {
      return {
        success: false,
        message: err?.name
          ? `${err.name}: ${err.message}`
          : err?.message || 'Connection failed',
        latencyMs: Date.now() - start,
      };
    } finally {
      client.destroy();
    }
  }

  async getUsage(tenantId: string, id: string) {
    const vault = await this.prisma.storageVault.findFirst({
      where: { id, tenantId },
    });
    if (!vault) throw new NotFoundException('Storage vault not found');

    return {
      usedBytes: vault.usedBytes.toString(),
      objectCount: vault.objectCount,
      lastCheckedAt: vault.lastCheckedAt,
    };
  }

  /**
   * Decrypt credentials for internal use (e.g., by the backup engine).
   */
  getDecryptedCredentials(vault: { accessKeyEncrypted: string | null; secretKeyEncrypted: string | null }) {
    return {
      accessKey: vault.accessKeyEncrypted ? this.decrypt(vault.accessKeyEncrypted) : null,
      secretKey: vault.secretKeyEncrypted ? this.decrypt(vault.secretKeyEncrypted) : null,
    };
  }

  private encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, tagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
