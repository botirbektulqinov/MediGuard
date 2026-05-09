import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, Length, ValidateNested } from 'class-validator';

import { DoctorProfileDto } from './doctor-profile.dto';

export class CreateStaffProfileDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty()
  @IsUUID()
  clinicId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({ example: 'EMP-1001' })
  @IsString()
  @Length(2, 40)
  employeeCode!: string;

  @ApiProperty({ example: 'Physician' })
  @IsString()
  @Length(2, 120)
  jobTitle!: string;

  @ApiProperty({ example: 'Clinical' })
  @IsString()
  @Length(2, 120)
  department!: string;

  @ApiPropertyOptional({ example: '+1-555-0120' })
  @IsOptional()
  @IsString()
  @Length(3, 40)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: DoctorProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DoctorProfileDto)
  doctorProfile?: DoctorProfileDto;
}
