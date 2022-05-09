import { constants } from '../module/constants';

export interface Advance {
  type: typeof constants.ADVANCE_TYPE;
  rank: number;
  notes: string;
  sort: number;
  parked: boolean;
}
