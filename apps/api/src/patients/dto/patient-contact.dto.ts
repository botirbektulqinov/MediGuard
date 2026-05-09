import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class PatientContactDto {
  @ApiProperty({ example: '+1-555-0199' })
  @IsString()
  @Length(3, 40)
  phone!: string;

  @ApiPropertyOptional({ example: 'patient@demo.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '200 Patient Road' })
  @IsString()
  @Length(3, 240)
  address!: string;

  @ApiPropertyOptional({ example: 'Boston' })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  city?: string;
}
