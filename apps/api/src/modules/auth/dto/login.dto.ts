import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ss123' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ example: '123456', description: 'TOTP MFA code (if MFA is enabled)' })
  @IsOptional()
  @IsString()
  mfaCode?: string;
}
