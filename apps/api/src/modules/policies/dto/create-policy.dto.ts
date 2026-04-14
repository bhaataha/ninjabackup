import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePolicyDto {
  @ApiProperty({ example: 'Daily File Backup' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['FILE', 'IMAGE', 'BOTH'], default: 'FILE' })
  @IsOptional()
  @IsEnum(['FILE', 'IMAGE', 'BOTH'])
  type?: string;

  @ApiPropertyOptional({ example: '0 2 * * *', description: 'Cron expression (default: daily at 2AM)' })
  @IsOptional()
  @IsString()
  scheduleCron?: string;

  @ApiPropertyOptional({ description: 'Storage vault ID to use' })
  @IsOptional()
  @IsString()
  storageVaultId?: string;

  @ApiPropertyOptional({ example: ['C:\\Users', 'D:\\Projects'] })
  @IsOptional()
  @IsArray()
  includePaths?: string[];

  @ApiPropertyOptional({ example: ['*.tmp', 'node_modules', '*.log'] })
  @IsOptional()
  @IsArray()
  excludePatterns?: string[];

  @ApiPropertyOptional({ default: 7 })
  @IsOptional()
  @IsInt()
  retentionDaily?: number;

  @ApiPropertyOptional({ default: 4 })
  @IsOptional()
  @IsInt()
  retentionWeekly?: number;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @IsInt()
  retentionMonthly?: number;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @IsInt()
  retentionYearly?: number;

  @ApiPropertyOptional({ description: 'Bandwidth limit in Mbps' })
  @IsOptional()
  @IsInt()
  bandwidthLimitMbps?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  compressionEnabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  vssEnabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
