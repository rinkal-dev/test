import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';

export enum PlatformEnum {
  IOS = 'ios',
  ANDROID = 'android',
}

export class Platform {
  @ApiProperty({ enum: ['ios', 'android'] })
  @IsNotEmpty({ message: 'Platform should not be an empty.' })
  @IsEnum(PlatformEnum, {
    message: 'Platform must be a valid enum value like ios or android.',
  })
  platform: string;

  @ApiProperty({ type: 'integer' })
  @IsNotEmpty({ message: 'Version number should not be an empty.' })
  @IsNumber()
  version: number;

  @ApiProperty()
  @IsNotEmpty({ message: 'Force Updatable should not be an empty.' })
  @IsBoolean({ message: 'Force Updatable must be a boolean value' })
  force_updatable: boolean;
}
