import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'DISABLED'] })
  @IsEnum(['ACTIVE', 'DISABLED'])
  status!: 'ACTIVE' | 'DISABLED';
}
