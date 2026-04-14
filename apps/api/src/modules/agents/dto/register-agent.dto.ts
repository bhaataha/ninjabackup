import { IsString, IsOptional, IsEnum, IsInt, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterAgentDto {
  @ApiProperty({ description: 'One-time registration token from the dashboard' })
  @IsString()
  registrationToken: string;

  @ApiProperty({ example: 'DESKTOP-ABC123' })
  @IsString()
  hostname: string;

  @ApiPropertyOptional({ example: 'John\'s Workstation' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ enum: ['WINDOWS', 'LINUX', 'MACOS'] })
  @IsEnum(['WINDOWS', 'LINUX', 'MACOS'])
  osType: 'WINDOWS' | 'LINUX' | 'MACOS';

  @ApiPropertyOptional({ example: 'Windows 11 Pro 23H2' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  agentVersion?: string;

  @ApiPropertyOptional({ description: 'TLS client certificate fingerprint for mTLS' })
  @IsOptional()
  @IsString()
  clientCertFingerprint?: string;

  @ApiPropertyOptional({ example: 'Intel Core i7-12700K' })
  @IsOptional()
  @IsString()
  cpuInfo?: string;

  @ApiPropertyOptional({ example: 32 })
  @IsOptional()
  @IsInt()
  ramGb?: number;

  @ApiPropertyOptional({
    example: [{ drive: 'C:', totalGb: 512, freeGb: 234, fsType: 'NTFS' }],
  })
  @IsOptional()
  @IsObject({ each: true })
  diskInfo?: any;
}
