import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateContentPage {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(3, 100)
  title: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(3, 50)
  slug: string;

  @ApiProperty()
  @IsString()
  content: string;
}
