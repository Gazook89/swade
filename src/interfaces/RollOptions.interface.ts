import { TraitRollModifier } from './additional.interface';

export default interface IRollOptions {
  rof?: number;
  flavour?: string;
  title?: string;
  dmgOverride?: string;
  additionalMods?: TraitRollModifier[];
  suppressChat?: boolean;
}
