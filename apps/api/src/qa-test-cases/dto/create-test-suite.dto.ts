import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateTestSuiteDto {
  @ApiProperty()
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 120)
  featureArea!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 1000)
  description?: string;
}
