import { PartialType } from '@nestjs/swagger';
import { CreateCancellationPolicyDto } from './CreateCancellationPolicyDto';

export class UpdateCancellationPolicyDto extends PartialType(CreateCancellationPolicyDto) {}
