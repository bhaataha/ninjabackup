import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface InstallerArtifact {
  platform: 'windows' | 'linux' | 'macos';
  arch: 'x64' | 'arm64';
  version: string;
  url: string;
  sha256: string;
  sizeBytes: number;
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  digest?: string;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
  body?: string;
}

const PLATFORM_ARCH_MAP: { suffix: string; platform: InstallerArtifact['platform']; arch: InstallerArtifact['arch'] }[] = [
  { suffix: 'windows-amd64.exe', platform: 'windows', arch: 'x64' },
  { suffix: 'linux-amd64', platform: 'linux', arch: 'x64' },
  { suffix: 'linux-arm64', platform: 'linux', arch: 'arm64' },
  { suffix: 'darwin-amd64', platform: 'macos', arch: 'x64' },
  { suffix: 'darwin-arm64', platform: 'macos', arch: 'arm64' },
];

/**
 * Lists installer artifacts. Source order:
 *   1. INSTALLER_MANIFEST_URL — explicit JSON manifest
 *   2. GitHub releases of the configured GITHUB_REPO (default: bhaataha/ninjabackup)
 *   3. Static stub describing the expected layout
 */
@Injectable()
export class InstallerService {
  private readonly logger = new Logger('InstallerService');
  private cache: { artifacts: InstallerArtifact[]; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  async list(): Promise<InstallerArtifact[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.artifacts;
    }

    const manifestUrl = this.config.get<string>('INSTALLER_MANIFEST_URL');
    if (manifestUrl) {
      try {
        const res = await fetch(manifestUrl, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const artifacts = (await res.json()) as InstallerArtifact[];
          this.cache = { artifacts, expiresAt: Date.now() + 5 * 60 * 1000 };
          return artifacts;
        }
      } catch (e) {
        this.logger.warn(`Manifest fetch failed: ${e}`);
      }
    }

    const repo = this.config.get<string>('GITHUB_REPO') ?? 'bhaataha/ninjabackup';
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const release = (await res.json()) as GitHubRelease;
        const version = release.tag_name.replace(/^v/, '');
        const artifacts: InstallerArtifact[] = [];
        for (const asset of release.assets ?? []) {
          for (const map of PLATFORM_ARCH_MAP) {
            if (asset.name.endsWith(map.suffix)) {
              artifacts.push({
                platform: map.platform,
                arch: map.arch,
                version,
                url: asset.browser_download_url,
                sha256: asset.digest?.replace(/^sha256:/, '') ?? '',
                sizeBytes: asset.size,
              });
              break;
            }
          }
        }
        if (artifacts.length > 0) {
          this.cache = { artifacts, expiresAt: Date.now() + 10 * 60 * 1000 };
          return artifacts;
        }
      }
    } catch (e) {
      this.logger.warn(`GitHub releases fetch failed: ${e}`);
    }

    // Static fallback so the UI shows something reasonable even before first release
    const baseUrl = this.config.get<string>('INSTALLER_BASE_URL') ?? `https://github.com/${repo}/releases/latest/download`;
    const version = this.config.get<string>('AGENT_VERSION') ?? '1.0.0';
    return [
      { platform: 'windows', arch: 'x64', version, url: `${baseUrl}/ninjabackup-agent-${version}-windows-amd64.exe`, sha256: '', sizeBytes: 0 },
      { platform: 'linux', arch: 'x64', version, url: `${baseUrl}/ninjabackup-agent-${version}-linux-amd64`, sha256: '', sizeBytes: 0 },
      { platform: 'linux', arch: 'arm64', version, url: `${baseUrl}/ninjabackup-agent-${version}-linux-arm64`, sha256: '', sizeBytes: 0 },
      { platform: 'macos', arch: 'arm64', version, url: `${baseUrl}/ninjabackup-agent-${version}-darwin-arm64`, sha256: '', sizeBytes: 0 },
      { platform: 'macos', arch: 'x64', version, url: `${baseUrl}/ninjabackup-agent-${version}-darwin-amd64`, sha256: '', sizeBytes: 0 },
    ];
  }

  /**
   * One-line install script the user can paste into a terminal. Token + server
   * URL are baked in so no extra args are needed.
   */
  async installScript(platform: 'windows' | 'linux' | 'macos', token: string, serverUrl?: string): Promise<string> {
    const apiUrl = serverUrl ?? this.config.get<string>('PUBLIC_API_URL') ?? 'https://api.backup.itninja.co.il';
    const artifacts = (await this.list()).filter((a) => a.platform === platform);

    if (platform === 'windows') {
      const win = artifacts.find((a) => a.arch === 'x64');
      const url = win?.url ?? '';
      return [
        '# Run as Administrator (Windows PowerShell)',
        `$Url = "${url}"`,
        '$Out = "$env:ProgramFiles\\NinjaBackup\\ninjabackup-agent.exe"',
        'New-Item -ItemType Directory -Force -Path (Split-Path $Out) | Out-Null',
        'Invoke-WebRequest -Uri $Url -OutFile $Out',
        `& $Out --register "${token}" --server "${apiUrl}"`,
        '& $Out --install',
        'Write-Host "✓ NinjaBackup Agent installed and registered."',
      ].join('\n');
    }

    const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
    const platformAsset =
      artifacts.find((a) => a.arch === arch) ?? artifacts.find((a) => a.arch === 'x64') ?? artifacts[0];
    const url = platformAsset?.url ?? '';

    return [
      '#!/bin/sh',
      'set -e',
      `URL="${url}"`,
      'BIN=/usr/local/bin/ninjabackup-agent',
      'echo "→ Downloading NinjaBackup agent..."',
      'sudo curl -fsSL "$URL" -o "$BIN"',
      'sudo chmod +x "$BIN"',
      `echo "→ Registering with server..."`,
      `sudo "$BIN" --register "${token}" --server "${apiUrl}"`,
      `echo "→ Installing system service..."`,
      'sudo "$BIN" --install',
      'echo "✓ NinjaBackup Agent installed and registered."',
    ].join('\n');
  }
}
