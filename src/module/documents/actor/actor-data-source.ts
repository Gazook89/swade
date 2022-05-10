import { AdditionalStat } from '../../../interfaces/additional';

declare global {
  interface SourceConfig {
    Actor: SwadeActorDataSource;
  }
}

export interface TraitDie {
  sides: number;
  modifier: number;
}

export interface WildDie {
  sides: number;
}

export type SwadeActorDataSource =
  | SwadeCharacterDataSource
  | SwadeNpcDataSource
  | SwadeVehicleDataSource;

interface SwadeCharacterDataSource {
  data: CharacterDataSourceData;
  type: 'character';
}

interface SwadeNpcDataSource {
  data: CharacterDataSourceData;
  type: 'npc';
}

interface SwadeVehicleDataSource {
  data: VehicleDataSourceData;
  type: 'vehicle';
}

export interface CharacterDataSourceData {
  attributes: {
    agility: {
      die: TraitDie;
      'wild-die': WildDie;
    };
    smarts: {
      die: TraitDie;
      'wild-die': WildDie;
      animal: boolean;
    };
    spirit: {
      die: TraitDie;
      'wild-die': WildDie;
      unShakeBonus: number;
    };
    strength: {
      die: TraitDie;
      'wild-die': WildDie;
      encumbranceSteps: number;
    };
    vigor: {
      die: TraitDie;
      'wild-die': WildDie;
    };
  };
  stats: {
    speed: {
      runningDie: number;
      runningMod: number;
      value: number;
    };
    toughness: {
      value: number;
      armor: number;
      modifier: number;
    };
    parry: {
      value: number;
      modifier: number;
    };
    size: number;
  };
  details: {
    currency: number;
    wealth: {
      die: number;
      modifier: number;
      'wild-die': number;
    };
    autoCalcToughness: boolean;
    autoCalcParry: boolean;
    biography: {
      value: string;
    };
    species: {
      name: string;
    };
    archetype: string;
    conviction: {
      value: number;
      active: boolean;
    };
  };
  fatigue: {
    value: number;
    min: number;
    max: number;
  };
  wounds: {
    value: number;
    min: number;
    max: number;
    ignored: number;
  };
  advances: {
    mode: 'legacy' | 'expanded';
    value: number;
    rank: string;
    details: string;
    // list: Array<Advance>;
  };
  bennies: {
    value: number;
    max: number;
  };
  status: {
    isShaken: boolean;
    isDistracted: boolean;
    isVulnerable: boolean;
    isStunned: boolean;
    isEntangled: boolean;
    isBound: boolean;
  };
  initiative: {
    hasHesitant: boolean;
    hasLevelHeaded: boolean;
    hasImpLevelHeaded: boolean;
    hasQuick: boolean;
  };
  powerPoints: {
    value: number;
    max: number;
  } & Record<string, { value: number; max: number }>;
  additionalStats: Record<string, AdditionalStat>;
  wildcard: boolean;
}

export interface VehicleDataSourceData {
  size: number;
  scale: number;
  classification: string;
  handling: number;
  cost: number;
  topspeed: number;
  description: string;
  maxCargo: number;
  maxMods: number;
  additionalStats: Record<string, AdditionalStat>;
  toughness: {
    total: number;
    armor: number;
  };
  wounds: {
    value: number;
    max: number;
    ignored: number;
  };
  crew: {
    required: {
      value: number;
      max: number;
    };
    optional: {
      value: number;
      max: number;
    };
  };
  driver: {
    id: string;
    skill: string;
    skillAlternative: string;
  };
  status: {
    isOutOfControl: boolean;
    isWrecked: boolean;
  };
  initiative: {
    hasHesitant: boolean;
    hasLevelHeaded: boolean;
    hasImpLevelHeaded: boolean;
    hasQuick: boolean;
  };
}
