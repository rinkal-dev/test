import { PartialType } from '@nestjs/swagger';
import { CreateGroupItineraryDto } from './CreateGroupItineraryDto';

export class UpdateGroupItineraryDto extends PartialType(CreateGroupItineraryDto) {}
