import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SecuritySeverity } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateSecurityIncidentDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceEventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;
}
