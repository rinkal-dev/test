import { PartialType } from '@nestjs/swagger';
import { CreateRoomTypeDto } from './CreateRoomTypeDto';

export class UpdateRoomTypeDto extends PartialType(CreateRoomTypeDto) {}
