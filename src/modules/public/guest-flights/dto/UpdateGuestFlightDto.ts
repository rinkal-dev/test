import { PartialType } from '@nestjs/swagger';
import { CreateGuestFlightDto } from './CreateGuestFlightDto';

export class UpdateGuestFlightDto extends PartialType(CreateGuestFlightDto) {}
