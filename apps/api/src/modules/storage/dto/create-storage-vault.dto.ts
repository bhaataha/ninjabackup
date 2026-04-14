import { IsString, IsOptional, IsEnum, IsBoolean, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStorageVaultDto {
  @ApiProperty({ example: 'Production S3' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['S3', 'MINIO', 'B2', 'R2', 'WASABI', 'LOCAL'] })
  @IsEnum(['S3', 'MINIO', 'B2', 'R2', 'WASABI', 'LOCAL'])
  type: string;

  @ApiPropertyOptional({ example: 'https://s3.amazonaws.com' })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({ example: 'us-east-1' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ example: 'my-backup-bucket' })
  @IsString()
  bucket: string;

  @ApiPropertyOptional({ example: 'backups/' })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiPropertyOptional({ example: 'AKIAIOSFODNN7EXAMPLE' })
  @IsOptional()
  @IsString()
  accessKey?: string;

  @ApiPropertyOptional({ example: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' })
  @IsOptional()
  @IsString()
  secretKey?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  immutableEnabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  versioningEnabled?: boolean;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  lifecycleHotDays?: number;

  @ApiPropertyOptional({ default: 90 })
  @IsOptional()
  @IsInt()
  lifecycleWarmDays?: number;
}
