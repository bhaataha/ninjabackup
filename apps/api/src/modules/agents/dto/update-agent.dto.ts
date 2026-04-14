import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAgentDto {
  @ApiPropertyOptional({ example: 'Office Server' })
  @IsOptional()
  @IsString()
  displayName?: string;
}
