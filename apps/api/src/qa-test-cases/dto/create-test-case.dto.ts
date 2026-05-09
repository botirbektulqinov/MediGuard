import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TestCasePriority } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateTestCaseDto {
  @ApiProperty()
  @IsUUID()
  suiteId!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 180)
  title!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 120)
  featureArea!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 1200)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 1200)
  preconditions?: string;

  @ApiProperty()
  @IsString()
  @Length(2, 4000)
  steps!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 2000)
  expectedResult!: string;

  @ApiPropertyOptional({ enum: TestCasePriority })
  @IsOptional()
  @IsEnum(TestCasePriority)
  priority?: TestCasePriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
