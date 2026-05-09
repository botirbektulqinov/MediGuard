import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Length, Matches, Min } from 'class-validator';

export class CreateClinicServiceDto {
  @ApiProperty()
  @IsUUID()
  clinicId!: string;

  @ApiProperty({ example: 'General Consultation' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: 'CONSULT' })
  @IsString()
  @Length(2, 30)
  @Matches(/^[A-Z0-9_-]+$/)
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 500)
  description?: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(5)
  durationMinutes!: number;

  @ApiProperty({ example: 7500 })
  @IsInt()
  @Min(0)
  priceCents!: number;
}
