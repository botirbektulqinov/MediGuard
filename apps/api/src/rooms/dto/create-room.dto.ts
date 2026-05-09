import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: 'Exam Room 1' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: 'EXAM-1' })
  @IsString()
  @Length(2, 30)
  @Matches(/^[A-Z0-9_-]+$/)
  code!: string;

  @ApiProperty({ example: 'EXAM' })
  @IsString()
  @Length(2, 60)
  type!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  capacity!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
