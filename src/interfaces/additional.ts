export interface AdditionalStat {
  dtype: 'String' | 'Number' | 'Boolean' | 'Die';
  hasMaxValue: boolean;
  label: string;
  useField?: boolean;
  value?: string | number;
  max?: string | number;
  modifier?: string;
}

export interface ItemAction {
  name: string;
  type: 'skill' | 'damage';
  rof?: number;
  shotsUsed?: number;
  skillMod?: string;
  skillOverride?: string;
  dmgMod?: string;
  dmgOverride?: string;
}

/** A single trait roll modifier, containing a label and a value */
export interface TraitRollModifier {
  /** The label of the modifier. Used in the hooks and for display */
  label: string;
  /** The value for the modifier. Can be an integer number or a a string, for example for dice expressions */
  value: string | number;
  /** An optional boolean that flags whether the modifier should be ignored and removed before the roll is evaluated */
  ignore?: boolean;
}

/** A trait roll modifier group, used in the RollDialog */
export interface TraitRollModifierGroup {
  /** The name of the group */
  name: string;
  /** The array of possible modifiers in the group */
  modifiers: TraitRollModifier[];
}
