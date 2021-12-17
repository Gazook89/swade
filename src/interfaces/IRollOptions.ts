import { TraitRollModifier } from './additional';

export default interface IRollOptions {
  rof?: number;
  flavour?: string;
  dmgOverride?: string;
  //TODO: Consider making this an array of DiceTerms
  additionalMods?: (string | number | TraitRollModifier)[];
  suppressChat?: boolean;
}
