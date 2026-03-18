import { CancellationPolicies } from 'src/models/CancellationPolicies';
import { WeddingGroups } from 'src/models/WeddingGroups';
import {
  CANCELLATION_POLICIES_REPOSITORY,
  WEDDING_GROUPS_REPOSITORY,
} from 'src/config/constants';

export const cancellationPoliciesProviders = [
  {
    provide: CANCELLATION_POLICIES_REPOSITORY,
    useValue: CancellationPolicies,
  },
  {
    provide: WEDDING_GROUPS_REPOSITORY,
    useValue: WeddingGroups,
  },
];
