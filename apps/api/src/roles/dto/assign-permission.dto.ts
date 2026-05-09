import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AssignPermissionDto {
  @ApiProperty({ example: 'users.read' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  permissionKey!: string;
}
