interface AdditionalStat {
  dType: string;
  hasMaxValue: boolean;
  label: string;
  useField?: boolean;
}

interface PhysicalItem {
  weight: number;
  price: number;
  quantity: number;
}

interface Equipable {
  equippable: boolean;
  equipped: boolean;
}

interface ItemDescription {
  description: string;
  notes: string;
  additionalStats: Partial<Record<string, AdditionalStat>>;
}

interface Vehicular {
  isVehicular: boolean;
  mods: number;
}

interface Action {
  name: string;
  type: 'skill' | 'damage';
  rof?: number;
  shotsUsed?: number;
  skillMod?: string;
  skillOverride: string;
}

interface Actions {
  actions: {
    skill: string;
    skillMod: string;
    dmgMod: string;
    additional: Partial<Record<string, Action>>;
  };
}

interface WeaponData
  extends PhysicalItem,
    ItemDescription,
    Equipable,
    Vehicular,
    Actions {
  damage: string;
  range: string;
  rof: number;
  ap: number;
  minStr: string;
  shots: number;
  currentShots: number;
  ammo: string;
  autoReload: boolean;
}

interface GearData extends ItemDescription, PhysicalItem, Equipable, Vehicular {
  /**/
}

interface ArmorData extends ItemDescription, PhysicalItem, Equipable {
  minStr: string;
  armor: number;
  isNaturalArmor: boolean;
  locations: {
    head: boolean;
    torso: boolean;
    arms: boolean;
    legs: boolean;
  };
}

interface ShieldData extends ItemDescription, PhysicalItem, Equipable, Actions {
  minStr: string;
  parry: number;
  cover: number;
}

interface EdgeData extends ItemDescription {
  isArcaneBackground: boolean;
  requirements: {
    value: string;
  };
}

interface HindranceData extends ItemDescription {
  major: boolean;
}

interface PowerData extends ItemDescription, Equipable, Actions {
  rank: string;
  pp: number;
  damage: string;
  range: string;
  duration: string;
  trapping: string;
  arcane: string;
  skill: string;
  modifiers: any[];
}

interface SkillData extends ItemDescription {
  attribute: string;
  die: {
    sides: number;
    modifier: number;
  };
  'wild-die': {
    sides: number;
  };
}

interface AbilityData extends ItemDescription {
  subtype: string;
  grantsPowers: boolean;
}

interface WeaponItemData extends Item.Data<WeaponData> {
  type: 'weapon';
}

interface GearItemData extends Item.Data<GearData> {
  type: 'gear';
}

interface ArmorItemData extends Item.Data<ArmorData> {
  type: 'armor';
}

interface ShieldItemData extends Item.Data<ShieldData> {
  type: 'shield';
}

interface EdgeItemData extends Item.Data<EdgeData> {
  type: 'egde';
}

interface HindranceItemData extends Item.Data<HindranceData> {
  type: 'hindrance';
}

interface PowerItemData extends Item.Data<PowerData> {
  type: 'power';
}

interface SkillItemData extends Item.Data<SkillData> {
  type: 'skill';
}

interface AbilityItemData extends Item.Data<AbilityData> {
  type: 'ability';
}

export type SysItemData =
  | WeaponItemData
  | GearItemData
  | ArmorItemData
  | ShieldItemData
  | EdgeItemData
  | HindranceItemData
  | PowerItemData
  | SkillItemData
  | AbilityItemData;
