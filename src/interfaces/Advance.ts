import { constants } from '../module/constants';

export interface Advance {
  type: ValueOf<typeof constants.ADVANCE_TYPE>;
  notes: string;
  sort: number;
  planned: boolean;
  id: string;
  rank?: ValueOf<typeof constants.RANK>;
}
