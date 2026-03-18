import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class ChangeStatusDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(['true', 'false'])
  status: boolean;
}
