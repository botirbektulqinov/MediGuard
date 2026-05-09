import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateVisitNotesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 2000)
  diagnosisNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 2000)
  recommendation?: string;
}
