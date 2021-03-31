import SettingConfigurator from './SettingConfigurator';
export function registerSettings() {
  game.settings.registerMenu('swade', 'setting-config', {
    name: game.i18n.localize('SWADE.SettingConf'),
    label: game.i18n.localize('SWADE.SettingConfLabel'),
    hint: game.i18n.localize('SWADE.SettingConfDesc'),
    icon: 'fas fa-globe',
    type: SettingConfigurator,
    restricted: true,
  });

  game.settings.register('swade', 'initiativeSound', {
    name: game.i18n.localize('SWADE.CardSound'),
    hint: game.i18n.localize('SWADE.CardSoundDesc'),
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
  });

  game.settings.register('swade', 'autoInit', {
    name: game.i18n.localize('SWADE.AutoInit'),
    hint: game.i18n.localize('SWADE.AutoInitDesc'),
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
  });

  game.settings.register('swade', 'initMessage', {
    name: game.i18n.localize('SWADE.CreateInitChat'),
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
  });

  game.settings.register('swade', 'hideNPCWildcards', {
    name: game.i18n.localize('SWADE.HideWC'),
    hint: game.i18n.localize('SWADE.HideWCDesc'),
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
  });

  game.settings.register('swade', 'autoLinkWildcards', {
    name: game.i18n.localize('SWADE.AutoLink'),
    hint: game.i18n.localize('SWADE.AutoLinkDesc'),
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
  });

  game.settings.register('swade', 'notifyBennies', {
    name: game.i18n.localize('SWADE.EnableBennyNotify'),
    hint: game.i18n.localize('SWADE.EnableBennyNotifyDesc'),
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
  });

  game.settings.register('swade', 'hideNpcItemChatCards', {
    name: game.i18n.localize('SWADE.HideNpcItemChatCards'),
    hint: game.i18n.localize('SWADE.HideNpcItemChatCardsDesc'),
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
  });
}
export function registerSettingRules() {
  game.settings.register('swade', 'coreSkills', {
    name: game.i18n.localize('SWADE.CoreSkills'),
    hint: game.i18n.localize('SWADE.CoreSkillsDesc'),
    default: 'Athletics, Common Knowledge, Notice, Persuasion, Stealth',
    scope: 'world',
    type: String,
    config: false,
  });

  game.settings.register('swade', 'jokersWild', {
    name: game.i18n.localize('SWADE.JokersWild'),
    hint: game.i18n.localize('SWADE.JokersWildDesc'),
    default: true,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'parryBaseSkill', {
    name: game.i18n.localize('SWADE.ParryBase'),
    hint: game.i18n.localize('SWADE.ParryBaseDesc'),
    default: 'Fighting',
    scope: 'world',
    type: String,
    config: false,
  });

  game.settings.register('swade', 'ammoManagement', {
    name: game.i18n.localize('SWADE.AmmoManagement'),
    hint: game.i18n.localize('SWADE.AmmoManagementDesc'),
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'ammoFromInventory', {
    name: game.i18n.localize('SWADE.PCAmmoFromInventory'),
    hint: game.i18n.localize('SWADE.PCAmmoFromInventoryDesc'),
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'npcAmmo', {
    name: game.i18n.localize('SWADE.NPCAmmoFromInventory'),
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'vehicleAmmo', {
    name: game.i18n.localize('SWADE.VehicleAmmoFromInventory'),
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'enableConviction', {
    name: game.i18n.localize('SWADE.EnableConv'),
    hint: game.i18n.localize('SWADE.EnableConvDesc'),
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'enableWoundPace', {
    name: game.i18n.localize('SWADE.EnableWoundPace'),
    hint: game.i18n.localize('SWADE.EnableWoundPaceDesc'),
    default: true,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'noPowerPoints', {
    name: game.i18n.localize('SWADE.NoPowerPoints'),
    hint: game.i18n.localize('SWADE.NoPowerPointsDesc'),
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'gmBennies', {
    name: game.i18n.localize('SWADE.GmBennies'),
    hint: game.i18n.localize('SWADE.GmBenniesDesc'),
    default: 0,
    scope: 'world',
    type: Number,
    config: false,
  });

  game.settings.register('swade', 'vehicleMods', {
    name: game.i18n.localize('SWADE.VehicleMods'),
    hint: game.i18n.localize('SWADE.VehicleModsDesc'),
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'vehicleEdges', {
    name: game.i18n.localize('SWADE.VehicleEdges'),
    hint: game.i18n.localize('SWADE.VehicleEdgesDesc'),
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'settingFields', {
    name: 'Arbitrary Setting Fields',
    default: { actor: {}, item: {} },
    scope: 'world',
    type: Object,
    config: false,
  });
}
