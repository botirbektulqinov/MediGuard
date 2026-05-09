import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ example: 'SUPER_ADMIN' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  roleName!: string;
}
