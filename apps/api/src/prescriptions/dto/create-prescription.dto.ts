import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreatePrescriptionDto {
  @ApiProperty()
  @IsString()
  @Length(2, 2000)
  note!: string;
}
