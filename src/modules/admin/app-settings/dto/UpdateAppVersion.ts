import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty } from 'class-validator';

export class UpdateAppVersion {
  // @ApiProperty()
  // @IsNotEmpty()
  // @IsString()
  // key: string;

  @ApiProperty({
    type: 'integer',
  })
  @IsNotEmpty()
  @IsInt()
  ios_version: number;

  @ApiProperty({ type: 'integer' })
  @IsNotEmpty()
  @IsInt()
  android_version: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  ios_force_update: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  android_force_update: boolean;
}
// {
//     "platform": "ios",
//     "version": 0,
//     "force_updatable": false
//   },
//   {
//     "platform": "android",
//     "version": 0,
//     "force_updatable": false
//   }
