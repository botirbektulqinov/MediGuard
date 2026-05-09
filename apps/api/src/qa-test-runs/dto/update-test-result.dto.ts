import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TestResultStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class UpdateTestResultDto {
  @ApiProperty({ enum: TestResultStatus })
  @IsEnum(TestResultStatus)
  status!: TestResultStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 2000)
  actualResult?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 1000)
  notes?: string;
}
