import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UploadLabResultDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 2000)
  resultSummary?: string;
}
