import { ApiPropertyOptional } from '@nestjs/swagger';
import { SecurityIncidentStatus, SecuritySeverity } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class UpdateSecurityIncidentDto {
  @ApiPropertyOptional({ enum: SecurityIncidentStatus })
  @IsOptional()
  @IsEnum(SecurityIncidentStatus)
  status?: SecurityIncidentStatus;

  @ApiPropertyOptional({ enum: SecuritySeverity })
  @IsOptional()
  @IsEnum(SecuritySeverity)
  severity?: SecuritySeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 4000)
  remediationNotes?: string;
}
