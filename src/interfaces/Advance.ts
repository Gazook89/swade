import { constants } from '../module/constants';

export interface Advance {
  type: typeof constants.ADVANCE_TYPE;
  notes: string;
  sort: number;
  parked: boolean;
  id: string;
}
