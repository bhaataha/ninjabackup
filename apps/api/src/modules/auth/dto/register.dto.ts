import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'My Company' })
  @IsString()
  organizationName: string;

  @ApiPropertyOptional({ example: 'Main Office', description: 'Defaults to "Main" if omitted' })
  @IsOptional()
  @IsString()
  tenantName?: string;

  @ApiPropertyOptional({
    example: 'my-company',
    description: 'URL-friendly tenant slug. Auto-derived from organizationName if omitted.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
  tenantSlug?: string;

  @ApiProperty({ example: 'admin@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ss123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;
}
