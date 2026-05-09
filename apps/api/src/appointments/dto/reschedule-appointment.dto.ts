import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class RescheduleAppointmentDto {
  @ApiProperty({ example: '2026-05-11T11:00:00.000Z' })
  @IsDateString()
  startAt!: string;
}
