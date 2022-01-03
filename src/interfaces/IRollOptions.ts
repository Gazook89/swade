import { TraitRollModifier } from './additional';

export default interface IRollOptions {
  rof?: number;
  flavour?: string;
  dmgOverride?: string;
  //TODO remove string/number type with 1.0.0
  additionalMods?: (string | number | TraitRollModifier)[];
  suppressChat?: boolean;
}
