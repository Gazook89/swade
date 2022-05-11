import { constants } from '../module/constants';

export interface Advance {
  type: ValueOf<typeof constants.ADVANCE_TYPE>;
  notes: string;
  /** the place of this particular advance in the track */
  sort: number;
  planned: boolean;
  id: string;
  /** only used for display */
  rank?: ValueOf<typeof constants.RANK>;
}
