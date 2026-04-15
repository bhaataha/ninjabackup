import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

/**
 * Tenant Data Encryption Key (DEK) storage.
 *
 * Two backends:
 *   - 'vault'  — HashiCorp Vault KV v2 at $VAULT_ADDR (path: kv/data/ninjabackup/dek/<tenantId>)
 *   - 'local'  — AES-256-GCM envelope encrypted with the master ENCRYPTION_KEY,
 *                stored on the Tenant.encryptedDekEnvelope column. (Default.)
 *
 * The selection is driven by VAULT_ADDR + VAULT_TOKEN env vars. If both are
 * present and Vault responds, the service uses Vault. Otherwise it transparently
 * falls back to the local backend so dev / single-tenant deployments keep working.
 */
@Injectable()
export class VaultService implements OnModuleInit {
  private readonly logger = new Logger('VaultService');
  private vaultAddr?: string;
  private vaultToken?: string;
  private vaultMount: string;
  private vaultEnabled = false;
  private masterKey: Buffer;

  constructor(private readonly config: ConfigService) {
    this.vaultAddr = this.config.get<string>('VAULT_ADDR');
    this.vaultToken = this.config.get<string>('VAULT_TOKEN');
    this.vaultMount = this.config.get<string>('VAULT_MOUNT') ?? 'kv';
    const masterHex = this.config.get<string>('ENCRYPTION_KEY') ?? '0'.repeat(64);
    // Derive a stable 32-byte key even if user supplies a non-hex value.
    this.masterKey = /^[0-9a-fA-F]{64}$/.test(masterHex)
      ? Buffer.from(masterHex, 'hex')
      : createHash('sha256').update(masterHex).digest();
  }

  async onModuleInit() {
    if (!this.vaultAddr || !this.vaultToken) {
      this.logger.log('Vault not configured — using local AES-256-GCM envelope encryption');
      return;
    }
    try {
      const r = await fetch(`${this.vaultAddr}/v1/sys/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (r.ok || r.status === 429 || r.status === 472 || r.status === 473) {
        // Standby (429) / DR (472) / performance standby (473) are still "reachable".
        this.vaultEnabled = true;
        this.logger.log(`Vault enabled at ${this.vaultAddr} (mount: ${this.vaultMount})`);
      } else {
        this.logger.warn(`Vault probe returned ${r.status} — falling back to local`);
      }
    } catch (e: any) {
      this.logger.warn(`Vault unreachable (${e.message ?? e}) — falling back to local`);
    }
  }

  isUsingVault(): boolean {
    return this.vaultEnabled;
  }

  /**
   * Persist a tenant's DEK envelope. Returns the ciphertext to store on
   * Tenant.encryptedDekEnvelope (or a Vault path reference when Vault is on).
   */
  async storeTenantDek(tenantId: string, dek: Buffer): Promise<string> {
    if (this.vaultEnabled) {
      await this.vaultWrite(`${this.vaultMount}/data/ninjabackup/dek/${tenantId}`, {
        data: { dek_b64: dek.toString('base64') },
      });
      return `vault:${tenantId}`;
    }
    return this.encryptEnvelope(dek);
  }

  /**
   * Resolve a stored envelope back to the raw DEK.
   */
  async loadTenantDek(tenantId: string, envelope: string): Promise<Buffer> {
    if (envelope.startsWith('vault:')) {
      if (!this.vaultEnabled) {
        throw new Error('Tenant DEK is in Vault but Vault is not configured');
      }
      const r = await this.vaultRead(`${this.vaultMount}/data/ninjabackup/dek/${tenantId}`);
      const b64 = r?.data?.data?.dek_b64;
      if (!b64) throw new Error('Vault returned no DEK');
      return Buffer.from(b64, 'base64');
    }
    return this.decryptEnvelope(envelope);
  }

  /**
   * Generate a fresh 32-byte DEK.
   */
  generateDek(): Buffer {
    return randomBytes(32);
  }

  // ─── Local AES-256-GCM envelope ─────────────────────────

  private encryptEnvelope(dek: Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.masterKey, iv);
    const ct = Buffer.concat([cipher.update(dek), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `local:${iv.toString('base64')}.${ct.toString('base64')}.${tag.toString('base64')}`;
  }

  private decryptEnvelope(envelope: string): Buffer {
    const stripped = envelope.startsWith('local:') ? envelope.slice(6) : envelope;
    const [ivB64, ctB64, tagB64] = stripped.split('.');
    if (!ivB64 || !ctB64 || !tagB64) throw new Error('Malformed envelope');
    const iv = Buffer.from(ivB64, 'base64');
    const ct = Buffer.from(ctB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]);
  }

  // ─── Vault KV v2 client (no SDK — keeps the dep tree small) ─

  private async vaultWrite(path: string, body: object): Promise<any> {
    const r = await fetch(`${this.vaultAddr}/v1/${path}`, {
      method: 'POST',
      headers: { 'X-Vault-Token': this.vaultToken!, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      throw new Error(`Vault write ${path} failed: ${r.status} ${text}`);
    }
    return r.json();
  }

  private async vaultRead(path: string): Promise<any> {
    const r = await fetch(`${this.vaultAddr}/v1/${path}`, {
      headers: { 'X-Vault-Token': this.vaultToken! },
      signal: AbortSignal.timeout(5000),
    });
    if (r.status === 404) return null;
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      throw new Error(`Vault read ${path} failed: ${r.status} ${text}`);
    }
    return r.json();
  }
}
