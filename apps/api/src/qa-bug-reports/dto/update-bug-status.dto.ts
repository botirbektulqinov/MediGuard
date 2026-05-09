import { ApiProperty } from '@nestjs/swagger';
import { BugStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateBugStatusDto {
  @ApiProperty({ enum: BugStatus })
  @IsEnum(BugStatus)
  status!: BugStatus;
}
