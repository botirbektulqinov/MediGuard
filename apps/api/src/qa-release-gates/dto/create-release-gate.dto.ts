import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class CreateReleaseGateDto {
  @ApiProperty()
  @IsUUID()
  testRunId!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 80)
  version!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  minPassRate?: number;
}
