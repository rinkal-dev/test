import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Admin } from './schema/Admin';

@ApiExtraModels(Admin, Admin)
export class AdminProfileRes {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: Admin })
  data: Admin;
}
