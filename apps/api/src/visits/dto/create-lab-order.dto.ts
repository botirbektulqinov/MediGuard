import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateLabOrderDto {
  @ApiProperty()
  @IsString()
  @Length(2, 160)
  testName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 1000)
  instructions?: string;
}
