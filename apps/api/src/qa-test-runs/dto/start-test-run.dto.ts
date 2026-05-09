import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Length } from 'class-validator';

export class StartTestRunDto {
  @ApiProperty()
  @IsUUID()
  suiteId!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 160)
  name!: string;
}
