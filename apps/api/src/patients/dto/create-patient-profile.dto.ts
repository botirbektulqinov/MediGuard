import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';

import { PatientContactDto } from './patient-contact.dto';
import { PatientEmergencyContactDto } from './patient-emergency-contact.dto';

export class CreatePatientProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty()
  @IsUUID()
  clinicId!: string;

  @ApiProperty({ example: 'MRN-1001' })
  @IsString()
  @Length(2, 60)
  medicalRecordNumber!: string;

  @ApiProperty({ example: 'Pat' })
  @IsString()
  @Length(1, 80)
  firstName!: string;

  @ApiProperty({ example: 'Patient' })
  @IsString()
  @Length(1, 80)
  lastName!: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ example: 'UNKNOWN' })
  @IsString()
  @Length(2, 40)
  gender!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  primaryDoctorId?: string;

  @ApiProperty({ type: PatientContactDto })
  @ValidateNested()
  @Type(() => PatientContactDto)
  contact!: PatientContactDto;

  @ApiPropertyOptional({ type: [PatientEmergencyContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientEmergencyContactDto)
  emergencyContacts?: PatientEmergencyContactDto[];
}
