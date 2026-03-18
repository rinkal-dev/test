import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty } from 'class-validator';
import { app_platforms } from '../config/app';

export class AppVersionDTO {
  @ApiProperty({ enum: app_platforms })
  @IsIn(app_platforms)
  @IsNotEmpty()
  platform: string;
}
