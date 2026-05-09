import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class PatientEmergencyContactDto {
  @ApiProperty({ example: 'Jordan Patient' })
  @IsString()
  @Length(2, 160)
  fullName!: string;

  @ApiProperty({ example: 'Spouse' })
  @IsString()
  @Length(2, 80)
  relationship!: string;

  @ApiProperty({ example: '+1-555-0188' })
  @IsString()
  @Length(3, 40)
  phone!: string;
}
