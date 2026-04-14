import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMfaDto {
  @ApiProperty({ description: 'Temporary MFA token received after login' })
  @IsString()
  tempToken: string;

  @ApiProperty({ example: '123456', description: 'TOTP code from authenticator app' })
  @IsString()
  mfaCode: string;
}
