import { ApiProperty } from '@nestjs/swagger';

export class User {
  @ApiProperty({
    title: 'ID',
    description: 'ID',
    type: 'integer',
  })
  id: number;

  @ApiProperty({
    title: 'UUID',
    description: 'UUID',
  })
  uuid: string;

  @ApiProperty({
    title: 'Name',
    description: 'Name',
  })
  name: string;

  @ApiProperty({
    title: 'Email',
    description: 'Email',
  })
  email: string;

  @ApiProperty({
    title: 'Mobile verified time.',
    description: 'Mobile verified time.',
    nullable: true,
  })
  mobile_verified_at: string;

  @ApiProperty({
    title: 'Country ISD code',
    description: 'Country ISD code',
    nullable: true,
  })
  isd_code: string;

  @ApiProperty({
    title: 'Mobile',
    description: 'Mobile',
    nullable: true,
  })
  mobile: string;
}
