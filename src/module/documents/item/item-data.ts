import { AdditionalStat, ItemAction } from '../../../interfaces/additional';
import { TraitDie, WildDie } from '../actor/actor-data-source';

declare global {
  interface SourceConfig {
    Item: SwadeItemDataSource;
  }
  interface DataConfig {
    Item: SwadeItemDataSource;
  }
}

export type SwadeItemDataSource =
  | WeaponItemDataSource
  | GearItemDataSource
  | ArmorItemDataSource
  | ShieldItemDataSource
  | EdgeItemDataSource
  | HindranceItemDataSource
  | PowerItemDataSource
  | SkillItemDataSource
  | AbilityItemDataSource;

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

interface Actions {
  actions: {
    skill: string;
    skillMod: string;
    dmgMod: string;
    additional: Partial<Record<string, ItemAction>>;
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

interface GearData
  extends ItemDescription,
    PhysicalItem,
    Equipable,
    Vehicular {}

interface ArmorData extends ItemDescription, PhysicalItem, Equipable {
  minStr: string;
  armor: number | string;
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
  isCoreSkill: boolean;
  die: TraitDie;
  'wild-die': WildDie;
}

interface AbilityData extends ItemDescription {
  subtype: string;
  grantsPowers: boolean;
}

interface WeaponItemDataSource {
  data: WeaponData;
  type: 'weapon';
}

interface GearItemDataSource {
  data: GearData;
  type: 'gear';
}

interface ArmorItemDataSource {
  data: ArmorData;
  type: 'armor';
}

interface ShieldItemDataSource {
  data: ShieldData;
  type: 'shield';
}

interface EdgeItemDataSource {
  data: EdgeData;
  type: 'edge';
}

interface HindranceItemDataSource {
  data: HindranceData;
  type: 'hindrance';
}

interface PowerItemDataSource {
  data: PowerData;
  type: 'power';
}

interface SkillItemDataSource {
  data: SkillData;
  type: 'skill';
}

interface AbilityItemDataSource {
  data: AbilityData;
  type: 'ability';
}
