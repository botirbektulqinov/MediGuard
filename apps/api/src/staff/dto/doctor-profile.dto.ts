import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class DoctorProfileDto {
  @ApiProperty({ example: 'Family Medicine' })
  @IsString()
  @Length(2, 120)
  specialty!: string;

  @ApiProperty({ example: 'MD-1001' })
  @IsString()
  @Length(2, 80)
  licenseNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  consultationRoomId?: string;

  @ApiPropertyOptional({
    example: { monday: [{ startsAt: '09:00', endsAt: '17:00' }] },
  })
  @IsOptional()
  @IsObject()
  schedule?: Record<string, unknown>;
}
