import { ApiPropertyOptional } from '@nestjs/swagger';
import { SecurityFindingStatus, SecuritySeverity } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, Length } from 'class-validator';

export class UpdateSecurityFindingDto {
  @ApiPropertyOptional({ enum: SecuritySeverity })
  @IsOptional()
  @IsEnum(SecuritySeverity)
  severity?: SecuritySeverity;

  @ApiPropertyOptional({ enum: SecurityFindingStatus })
  @IsOptional()
  @IsEnum(SecurityFindingStatus)
  status?: SecurityFindingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 4000)
  remediation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  evidence?: Record<string, unknown>;
}
