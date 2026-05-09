import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty()
  @IsUUID()
  clinicId!: string;

  @ApiProperty({ example: 'Main Branch' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: 'MAIN' })
  @IsString()
  @Length(2, 30)
  @Matches(/^[A-Z0-9_-]+$/)
  code!: string;

  @ApiProperty({ example: '100 Clinic Way' })
  @IsString()
  @Length(3, 240)
  address!: string;

  @ApiPropertyOptional({ example: '+1-555-0101' })
  @IsOptional()
  @IsString()
  @Length(3, 40)
  phone?: string;
}
