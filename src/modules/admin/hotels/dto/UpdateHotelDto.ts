import { PartialType } from '@nestjs/swagger';
import { CreateHotelDto } from './CreateHotelDto';

export class UpdateHotelDto extends PartialType(CreateHotelDto) {}
