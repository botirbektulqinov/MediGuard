import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class EnqueueAppointmentDto {
  @ApiProperty()
  @IsUUID()
  appointmentId!: string;
}
