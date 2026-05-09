import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateClinicDto {
  @ApiProperty({ example: 'MediGuard Demo Clinic' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: 'mediguard-demo' })
  @IsString()
  @Length(2, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiPropertyOptional({ example: '+1-555-0100' })
  @IsOptional()
  @IsString()
  @Length(3, 40)
  phone?: string;

  @ApiPropertyOptional({ example: 'admin@mediguard.test' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '100 Clinic Way' })
  @IsOptional()
  @IsString()
  @Length(3, 240)
  address?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  timezone?: string;
}
