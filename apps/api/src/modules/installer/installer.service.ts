import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface InstallerArtifact {
  platform: 'windows' | 'linux' | 'macos';
  arch: 'x64' | 'arm64';
  version: string;
  url: string;
  sha256: string;
  sizeBytes: number;
}

/**
 * Lists installer artifacts. In production these are read from object storage
 * after the CI pipeline publishes them. For now we read from env-backed manifest
 * (`INSTALLER_MANIFEST_URL`) or fall back to a static stub describing the layout
 * the agent will support.
 */
@Injectable()
export class InstallerService {
  constructor(private readonly config: ConfigService) {}

  async list(): Promise<InstallerArtifact[]> {
    const manifestUrl = this.config.get<string>('INSTALLER_MANIFEST_URL');
    if (manifestUrl) {
      try {
        const res = await fetch(manifestUrl, { signal: AbortSignal.timeout(5000) });
        if (res.ok) return (await res.json()) as InstallerArtifact[];
      } catch {
        // fall through to static
      }
    }
    const baseUrl = this.config.get<string>('INSTALLER_BASE_URL') ?? 'https://downloads.ninjabackup.local/agent';
    const version = this.config.get<string>('AGENT_VERSION') ?? '1.0.0';
    return [
      { platform: 'windows', arch: 'x64', version, url: `${baseUrl}/v${version}/NinjaBackup-Agent-Setup-${version}.exe`, sha256: '', sizeBytes: 0 },
      { platform: 'linux', arch: 'x64', version, url: `${baseUrl}/v${version}/ninjabackup-agent-${version}-linux-x64`, sha256: '', sizeBytes: 0 },
      { platform: 'linux', arch: 'arm64', version, url: `${baseUrl}/v${version}/ninjabackup-agent-${version}-linux-arm64`, sha256: '', sizeBytes: 0 },
      { platform: 'macos', arch: 'arm64', version, url: `${baseUrl}/v${version}/ninjabackup-agent-${version}-darwin-arm64`, sha256: '', sizeBytes: 0 },
      { platform: 'macos', arch: 'x64', version, url: `${baseUrl}/v${version}/ninjabackup-agent-${version}-darwin-x64`, sha256: '', sizeBytes: 0 },
    ];
  }

  installScript(platform: 'windows' | 'linux' | 'macos'): string {
    const apiUrl = this.config.get<string>('PUBLIC_API_URL') ?? 'https://api.ninjabackup.local';
    if (platform === 'windows') {
      return `# Run as Administrator\n` + `Invoke-WebRequest -Uri "${apiUrl}/installer/windows" -OutFile NinjaBackup.exe; Start-Process .\\NinjaBackup.exe -Wait`;
    }
    return `#!/bin/sh\nset -e\ncurl -fsSL "${apiUrl}/installer/${platform}" -o /tmp/ninjabackup-agent\nchmod +x /tmp/ninjabackup-agent\nsudo mv /tmp/ninjabackup-agent /usr/local/bin/ninjabackup-agent\nsudo /usr/local/bin/ninjabackup-agent --install\n`;
  }
}
