export default interface IRollOptions {
  rof?: number;
  flavour?: string;
  dmgOverride?: string;
  //TODO: Consider making this an array of DiceTerms
  additionalMods?: (string | number)[];
  suppressChat?: boolean;
}
