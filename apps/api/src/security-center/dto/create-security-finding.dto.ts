import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SecuritySeverity } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateSecurityFindingDto {
  @ApiProperty()
  @IsString()
  @Length(2, 180)
  title!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 4000)
  description!: string;

  @ApiProperty({ enum: SecuritySeverity })
  @IsEnum(SecuritySeverity)
  severity!: SecuritySeverity;

  @ApiProperty()
  @IsString()
  @Length(2, 120)
  affectedModule!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  evidence?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 4000)
  remediation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  incidentId?: string;
}
