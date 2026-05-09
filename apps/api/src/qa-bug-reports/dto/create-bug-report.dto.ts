import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BugSeverity } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateBugReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  testRunResultId?: string;

  @ApiProperty()
  @IsString()
  @Length(2, 180)
  title!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 4000)
  description!: string;

  @ApiProperty({ enum: BugSeverity })
  @IsEnum(BugSeverity)
  severity!: BugSeverity;

  @ApiProperty()
  @IsString()
  @Length(2, 120)
  featureArea!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;
}
