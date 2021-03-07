import { SysItemData } from './item-data';

interface AdditionalStat {
  dType: string;
  hasMaxValue: boolean;
  label: string;
  useField?: boolean;
}

interface CharacterCommon {
  attributes: {
    agility: {
      die: {
        side: number;
        modifier: number;
      };
      'wild-die': {
        sides: number;
      };
    };
    smarts: {
      animal: boolean;
      die: {
        side: number;
        modifier: number;
      };
      'wild-die': {
        sides: number;
      };
    };
    spirit: {
      unShakeBonus: number;
      die: {
        side: number;
        modifier: number;
      };
      'wild-die': {
        sides: number;
      };
    };
    strenght: {
      encumbranceSteps: number;
      die: {
        side: number;
        modifier: number;
      };
      'wild-die': {
        sides: number;
      };
    };
    vigor: {
      die: {
        side: number;
        modifier: number;
      };
      'wild-die': {
        sides: number;
      };
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
    autoCalcToughness: boolean;
    autoCalcParry: boolean;
    biography: {
      value: string;
    };
    species: {
      name: string;
    };
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
    value: number;
    rank: string;
    details: string;
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
  };
  powerPoints: any; //FIXME Find better type
  additionalStats: Partial<Record<string, AdditionalStat>>;
  wildcard: boolean;
}

interface VehicleCommon {
  size: number;
  scale: number;
  classification: string;
  handling: number;
  cost: number;
  topspeed: number;
  description: string;
  maxCargo: number;
  maxMods: number;
  additionalStats: Partial<Record<string, AdditionalStat>>;
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
  };
}

interface CharacterActorData extends Actor.Data<CharacterCommon, SysItemData> {
  type: 'character';
}

interface NpcActorData extends Actor.Data<CharacterCommon, SysItemData> {
  type: 'npc';
}

interface VehicleActorData extends Actor.Data<VehicleCommon, SysItemData> {
  type: 'vehicle';
}

export type SysActorData = CharacterActorData | NpcActorData | VehicleActorData;
