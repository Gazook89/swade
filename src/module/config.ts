/* eslint-disable @typescript-eslint/naming-convention */
import { StatusEffect } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/documents/token';
import { AbilitySubType } from '../globals';
import { TraitRollModifierGroup } from '../interfaces/additional.interface';
import { TemplateConfig } from '../interfaces/TemplateConfig.interface';
import { constants } from './constants';
import SwadeMeasuredTemplate from './documents/SwadeMeasuredTemplate';

export const SWADE: SwadeConfig = {
  ASCII: `
  ███████╗██╗    ██╗ █████╗ ██████╗ ███████╗
  ██╔════╝██║    ██║██╔══██╗██╔══██╗██╔════╝
  ███████╗██║ █╗ ██║███████║██║  ██║█████╗
  ╚════██║██║███╗██║██╔══██║██║  ██║██╔══╝
  ███████║╚███╔███╔╝██║  ██║██████╔╝███████╗
  ╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝`,

  attributes: {
    agility: {
      long: 'SWADE.AttrAgi',
      short: 'SWADE.AttrAgiShort',
    },
    smarts: {
      long: 'SWADE.AttrSma',
      short: 'SWADE.AttrSmaShort',
    },
    spirit: {
      long: 'SWADE.AttrSpr',
      short: 'SWADE.AttrSprShort',
    },
    strength: {
      long: 'SWADE.AttrStr',
      short: 'SWADE.AttrStrShort',
    },
    vigor: {
      long: 'SWADE.AttrVig',
      short: 'SWADE.AttrVigShort',
    },
  },

  imagedrop: {
    height: 300,
  },

  bennies: {
    templates: {
      refresh: 'systems/swade/templates/chat/benny-refresh.hbs',
      refreshAll: 'systems/swade/templates/chat/benny-refresh-all.hbs',
      add: 'systems/swade/templates/chat/benny-add.hbs',
      spend: 'systems/swade/templates/chat/benny-spend.hbs',
      gmadd: 'systems/swade/templates/chat/benny-gmadd.hbs',
      joker: 'systems/swade/templates/chat/jokers-wild.hbs',
    },
  },

  vehicles: {
    maxHandlingPenalty: -4,
    opSkills: ['', 'Boating', 'Driving', 'Piloting', 'Riding'],
  },

  settingConfig: {
    id: 'settingConfig',
    title: 'SWADE Setting Rule Configurator',
    settings: [
      'coreSkills',
      'coreSkillsCompendium',
      'enableConviction',
      'jokersWild',
      'vehicleMods',
      'vehicleEdges',
      'gmBennies',
      'enableWoundPace',
      'ammoManagement',
      'ammoFromInventory',
      'npcAmmo',
      'vehicleAmmo',
      'noPowerPoints',
      'wealthType',
      'currencyName',
      'hardChoices',
      'actionDeck',
      'applyEncumbrance',
      'actionDeckDiscardPile',
      'bennyImageSheet',
      'bennyImage3DFront',
      'bennyImage3DBack',
      '3dBennyFrontBump',
      '3dBennyBackBump',
    ],
  },

  diceConfig: {
    id: 'diceConfig',
    title: 'SWADE Dice Settings',
    flags: {},
  },

  actionCardEditor: {
    id: 'actionCardEditor',
  },

  statusEffects: [
    {
      icon: 'systems/swade/assets/icons/status/status_shaken.svg',
      id: 'shaken',
      label: 'SWADE.Shaken',
      duration: {
        rounds: 1,
      },
      changes: [
        {
          key: 'data.status.isShaken',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: 'true',
        },
      ],
      flags: {
        swade: {
          expiration: constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt,
          loseTurnOnHold: true,
        },
      },
    },
    {
      icon: 'icons/svg/skull.svg',
      id: 'incapacitated',
      label: 'SWADE.Incap',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_aiming.svg',
      id: 'aiming',
      label: 'SWADE.Aiming',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_enraged.svg',
      id: 'berserk',
      label: 'SWADE.Berserk',
      duration: {
        rounds: 10,
      },
      changes: [
        {
          key: 'data.attributes.strength.die.sides',
          value: '2',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
        },
        {
          key: 'data.stats.toughness.value',
          value: '2',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
        },
        {
          key: 'data.wounds.ignored',
          value: '1',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flags: {
        swade: {
          expiration: constants.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt,
        },
      },
    },
    {
      icon: 'systems/swade/assets/icons/status/status_defending.svg',
      id: 'defending',
      label: 'SWADE.Defending',
      duration: {
        rounds: 1,
      },
      changes: [
        {
          key: 'data.stats.parry.modifier',
          value: '4',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flags: {
        swade: {
          expiration: constants.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto,
        },
      },
    },
    {
      icon: 'systems/swade/assets/icons/status/status_flying.svg',
      id: 'flying',
      label: 'SWADE.Flying',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_holding.svg',
      id: 'holding',
      label: 'SWADE.Holding',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_bound.svg',
      id: 'bound',
      label: 'SWADE.Bound',
      changes: [
        {
          key: 'data.status.isBound',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: 'true',
        },
        {
          key: 'data.status.isDistracted',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: 'true',
        },
        {
          key: 'data.status.isVulnerable',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: 'true',
        },
      ],
    },
    {
      icon: 'systems/swade/assets/icons/status/status_entangled.svg',
      id: 'entangled',
      label: 'SWADE.Entangled',
      changes: [
        {
          key: 'data.status.isEntangled',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: 'true',
        },
        {
          key: 'data.status.isDistracted',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: 'true',
        },
      ],
    },
    {
      icon: 'systems/swade/assets/icons/status/status_frightened.svg',
      id: 'frightened',
      label: 'SWADE.Frightened',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_distracted.svg',
      id: 'distracted',
      label: 'SWADE.Distr',
      duration: {
        rounds: 1,
      },
      changes: [
        {
          key: 'data.status.isDistracted',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: 'true',
        },
      ],
      flags: {
        swade: {
          expiration: constants.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto,
        },
      },
    },
    {
      icon: 'systems/swade/assets/icons/status/status_encumbered.svg',
      id: 'encumbered',
      label: 'SWADE.Encumbered',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_prone.svg',
      id: 'prone',
      label: 'SWADE.Prone',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_stunned.svg',
      id: 'stunned',
      label: 'SWADE.Stunned',
      duration: {
        rounds: 1,
      },
      changes: [
        {
          key: 'data.status.isStunned',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: 'true',
        },
      ],
      flags: {
        swade: {
          expiration: constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt,
          loseTurnOnHold: true,
        },
      },
    },
    {
      icon: 'systems/swade/assets/icons/status/status_vulnerable.svg',
      id: 'vulnerable',
      label: 'SWADE.Vuln',
      duration: {
        rounds: 1,
      },
      changes: [
        {
          key: 'data.status.isVulnerable',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: 'true',
        },
      ],
      flags: {
        swade: {
          expiration: constants.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto,
        },
      },
    },
    {
      icon: 'systems/swade/assets/icons/status/status_bleeding_out.svg',
      id: 'bleeding-out',
      label: 'SWADE.BleedingOut',
      duration: {
        rounds: 1,
      },
      flags: {
        swade: {
          expiration: constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt,
        },
      },
    },
    {
      icon: 'systems/swade/assets/icons/status/status_diseased.svg',
      id: 'diseased',
      label: 'SWADE.Diseased',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_heart_attack.svg',
      id: 'heart-attack',
      label: 'SWADE.HeartAttack',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_on_fire.svg',
      id: 'on-fire',
      label: 'SWADE.OnFire',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_poisoned.svg',
      id: 'poisoned',
      label: 'SWADE.Poisoned',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_cover_shield.svg',
      id: 'cover-shield',
      label: 'SWADE.Cover.Shield',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_cover.svg',
      id: 'cover',
      label: 'SWADE.Cover._name',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_reach.svg',
      id: 'reach',
      label: 'SWADE.Reach',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_torch.svg',
      id: 'torch',
      label: 'SWADE.Torch',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_invisible.svg',
      id: 'invisible',
      label: 'SWADE.Invisible',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_smite.svg',
      id: 'smite',
      label: 'SWADE.Smite',
    },
    {
      icon: 'systems/swade/assets/icons/status/status_protection.svg',
      id: 'protection',
      label: 'SWADE.Protection',
      duration: {
        rounds: 5,
      },
      changes: [
        {
          key: 'data.stats.toughness.value',
          value: '0',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
        },
        {
          key: 'data.stats.toughness.armor',
          value: '0',
          mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flags: {
        swade: {
          expiration: constants.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt,
        },
      },
    },
  ],

  wildCardIcons: {
    regular: 'systems/swade/assets/ui/wildcard.svg',
    compendium: 'systems/swade/assets/ui/wildcard-dark.svg',
  },

  measuredTemplatePresets: [
    {
      data: { t: CONST.MEASURED_TEMPLATE_TYPES.CONE, distance: 9 },
      button: {
        name: constants.TEMPLATE_PRESET.CONE,
        title: 'SWADE.Cone',
        icon: 'text-icon cone',
        visible: true,
        button: true,
        onClick: () => {
          SwadeMeasuredTemplate.fromPreset(constants.TEMPLATE_PRESET.CONE);
        },
      },
    },
    {
      data: { t: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE, distance: 1 },
      button: {
        name: constants.TEMPLATE_PRESET.SBT,
        title: 'SWADE.SBT',
        icon: 'text-icon sbt',
        visible: true,
        button: true,
        onClick: () => {
          SwadeMeasuredTemplate.fromPreset(constants.TEMPLATE_PRESET.SBT);
        },
      },
    },
    {
      data: { t: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE, distance: 2 },
      button: {
        name: constants.TEMPLATE_PRESET.MBT,
        title: 'SWADE.MBT',
        icon: 'text-icon mbt',
        visible: true,
        button: true,
        onClick: () => {
          SwadeMeasuredTemplate.fromPreset(constants.TEMPLATE_PRESET.MBT);
        },
      },
    },
    {
      data: { t: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE, distance: 3 },
      button: {
        name: constants.TEMPLATE_PRESET.LBT,
        title: 'SWADE.LBT',
        icon: 'text-icon lbt',
        visible: true,
        button: true,
        onClick: () => {
          SwadeMeasuredTemplate.fromPreset(constants.TEMPLATE_PRESET.LBT);
        },
      },
    },
  ],

  activeMeasuredTemplatePreview: null,

  dsnColorSets: {},

  dsnTextureList: {},

  abilitySheet: {
    special: {
      dropdown: 'SWADE.SpecialAbility',
      abilities: 'SWADE.SpecialAbilities',
    },
    race: {
      dropdown: 'SWADE.Race',
      abilities: 'SWADE.RacialAbilities',
    },
    archetype: {
      dropdown: 'SWADE.Archetype',
      abilities: 'SWADE.ArchetypeAbilities',
    },
  },

  prototypeRollGroups: [
    {
      name: 'SWADE.Range._name',
      modifiers: [
        { label: 'SWADE.Range.Medium', value: -2 },
        { label: 'SWADE.Range.Long', value: -4 },
        { label: 'SWADE.Range.Extreme', value: -8 },
      ],
    },
    {
      name: 'SWADE.Cover._name',
      modifiers: [
        { label: 'SWADE.Cover.Light', value: -2 },
        { label: 'SWADE.Cover.Medium', value: -4 },
        { label: 'SWADE.Cover.Heavy', value: -6 },
        { label: 'SWADE.Cover.Total', value: -8 },
      ],
    },
    {
      name: 'SWADE.Illumination._name',
      modifiers: [
        { label: 'SWADE.Illumination.Dim', value: -2 },
        { label: 'SWADE.Illumination.Dark', value: -4 },
        { label: 'SWADE.Illumination.Pitch', value: -6 },
      ],
    },
    {
      name: 'SWADE.ModOther',
      modifiers: [
        { label: 'SWADE.Snapfire', value: -2 },
        { label: 'SWADE.UnstablePlatform', value: -2 },
        { label: 'SWADE.Encumbered', value: -2 },
      ],
    },
  ],

  CONST: constants,

  ranks: [
    'SWADE.Ranks.Novice',
    'SWADE.Ranks.Seasoned',
    'SWADE.Ranks.Veteran',
    'SWADE.Ranks.Heroic',
    'SWADE.Ranks.Legendary',
  ],
};

export interface SwadeConfig {
  //a piece of ASCII art for the init log message
  ASCII: string;

  CONST: typeof constants;

  //An object to store localization strings
  attributes: {
    agility: {
      long: string;
      short: string;
    };
    smarts: {
      long: string;
      short: string;
    };
    spirit: {
      long: string;
      short: string;
    };
    strength: {
      long: string;
      short: string;
    };
    vigor: {
      long: string;
      short: string;
    };
  };

  imagedrop: {
    height: number;
  };

  bennies: {
    templates: {
      refresh: string;
      refreshAll: string;
      add: string;
      spend: string;
      gmadd: string;
      joker: string;
    };
  };

  vehicles: {
    maxHandlingPenalty: number;
    opSkills: Array<string>;
  };

  settingConfig: {
    id: string;
    title: string;
    settings: Array<string>;
  };

  diceConfig: {
    id: string;
    title: string;
    flags: Record<string, any>;
  };

  actionCardEditor: {
    id: string;
  };

  statusEffects: StatusEffect[];

  wildCardIcons: {
    regular: string;
    compendium: string;
  };

  measuredTemplatePresets: Array<TemplateConfig>;

  activeMeasuredTemplatePreview: SwadeMeasuredTemplate | null;

  dsnColorSets: any;
  dsnTextureList: any;

  abilitySheet: Record<AbilitySubType, { dropdown: string; abilities: string }>;

  prototypeRollGroups: TraitRollModifierGroup[];

  ranks: string[];
}
