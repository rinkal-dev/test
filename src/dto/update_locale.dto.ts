import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty } from 'class-validator';
import { locales } from 'src/config/app';

export class UpdateLocaleDTO {
  @ApiProperty({
    enum: locales,
  })
  @IsNotEmpty()
  @IsIn(locales)
  locale: string;
}
