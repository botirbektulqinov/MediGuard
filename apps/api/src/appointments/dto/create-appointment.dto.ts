import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateAppointmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiProperty()
  @IsUUID()
  doctorId!: string;

  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({ example: '2026-05-11T10:00:00.000Z' })
  @IsDateString()
  startAt!: string;

  @ApiPropertyOptional({ example: 'Annual checkup' })
  @IsOptional()
  @IsString()
  @Length(2, 500)
  reason?: string;
}
