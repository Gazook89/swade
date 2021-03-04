/**
 * This is the TypeScript entry file for Foundry VTT.
 * Author: FloRad
 * Content License: All Rights Reserved Pinnacle Entertainment, Inc
 * Software License: Apache License, Version 2.0
 */

import Benny from './module/Benny';
import { getSwadeConeShape } from './module/cone';
import { SWADE } from './module/config';
import SwadeEntityTweaks from './module/dialog/entity-tweaks';
import SwadeActor from './module/entities/SwadeActor';
import SwadeItem from './module/entities/SwadeItem';
import { registerCustomHelpers } from './module/handlebarsHelpers';
import ItemChatCardHelper from './module/ItemChatCardHelper';
import { listenJournalDrop } from './module/journalDrop';
import { preloadHandlebarsTemplates } from './module/preloadTemplates';
import { registerSettingRules, registerSettings } from './module/settings';
import CharacterSheet from './module/sheets/official/CharacterSheet';
import SwadeCharacterSheet from './module/sheets/SwadeCharacterSheet';
import SwadeItemSheet from './module/sheets/SwadeItemSheet';
import SwadeNPCSheet from './module/sheets/SwadeNPCSheet';
import SwadeVehicleSheet from './module/sheets/SwadeVehicleSheet';
import SwadeCombat from './module/SwadeCombat';
import SwadeHooks from './module/SwadeHooks';
import SwadeSocketHandler from './module/SwadeSocketHandler';
import { rollPowerMacro, rollSkillMacro, rollWeaponMacro } from './module/util';

/* ------------------------------------ */
/* Initialize system					          */
/* ------------------------------------ */
Hooks.once('init', () => {
  console.log(
    `SWADE | Initializing Savage Worlds Adventure Edition\n${SWADE.ASCII}`,
  );

  // Record Configuration Values
  // CONFIG.debug.hooks = true;
  CONFIG.SWADE = SWADE;

  game.swade = {
    SwadeActor,
    SwadeItem,
    SwadeEntityTweaks,
    rollSkillMacro,
    rollWeaponMacro,
    rollPowerMacro,
    sockets: new SwadeSocketHandler(),
    itemChatCardHelper: ItemChatCardHelper,
  };

  //Register custom Handlebars helpers
  registerCustomHelpers();

  //Overwrite method prototypes
  MeasuredTemplate.prototype._getConeShape = getSwadeConeShape;

  // Register custom classes
  CONFIG.Actor.entityClass = SwadeActor;
  CONFIG.Item.entityClass = SwadeItem;
  CONFIG.Combat.entityClass = SwadeCombat;
  CONFIG.statusEffects = SWADE.statusEffects;

  // Register custom system settings
  registerSettings();
  registerSettingRules();

  // Register sheets
  Actors.unregisterSheet('core', ActorSheet);
  Items.unregisterSheet('core', ItemSheet);

  Actors.registerSheet('swade', CharacterSheet, {
    types: ['character'],
    makeDefault: true,
    label: game.i18n.localize('SWADE.OfficialSheet'),
  });

  Actors.registerSheet('swade', SwadeCharacterSheet, {
    types: ['character'],
    label: 'SWADE.CommunityCharSheet',
  });

  Actors.registerSheet('swade', SwadeNPCSheet, {
    types: ['npc'],
    label: 'SWADE.CommunityNPCSheet',
  });
  Actors.registerSheet('swade', SwadeVehicleSheet, {
    types: ['vehicle'],
    makeDefault: true,
    label: 'SWADE.CommunityVicSheet',
  });
  Items.registerSheet('swade', SwadeItemSheet, {
    makeDefault: true,
    label: 'SWADE.CommunityItemSheet',
  });

  CONFIG.Dice.terms['b'] = Benny;

  // Drop a journal image to a tile (for cards)
  listenJournalDrop();

  // Preload Handlebars templates
  SWADE.templates.preloadPromise = preloadHandlebarsTemplates();
  SWADE.templates.preloadPromise.then(() => {
    SWADE.templates.templatesPreloaded = true;
  });
});

/* ------------------------------------ */
/* Setup system							            */
/* ------------------------------------ */
Hooks.once('setup', () => SwadeHooks.onSetup());

/* ------------------------------------ */
/* When ready						              	*/
/* ------------------------------------ */
Hooks.once('ready', async () => SwadeHooks.onReady());

Hooks.on('preCreateItem', (createData: any, options: any, userId: string) =>
  SwadeHooks.onPreCreateItem(createData, options, userId),
);

Hooks.on(
  'preCreateOwnedItem',
  (actor: SwadeActor, createData: any, options: any, userId: string) =>
    SwadeHooks.onPreCreateOwnedItem(actor, createData, options, userId),
);

Hooks.on(
  'preCreateActor',
  async (createData: any, options: any, userId: string) =>
    SwadeHooks.onPreCreateActor(createData, options, userId),
);

Hooks.on(
  'createActor',
  async (actor: SwadeActor, options: any, userId: string) =>
    SwadeHooks.onCreateActor(actor, options, userId),
);

Hooks.on(
  'renderActorDirectory',
  (app: ActorDirectory, html: JQuery<HTMLElement>, options: any) =>
    SwadeHooks.onRenderActorDirectory(app, html, options),
);

Hooks.on(
  'renderCompendium',
  async (app: Compendium, html: JQuery<HTMLElement>, data: any) =>
    SwadeHooks.onRenderCompendium(app, html, data),
);

Hooks.on(
  'preUpdateActor',
  (actor: SwadeActor, updateData: any, options: any, userId: string) =>
    SwadeHooks.onPreUpdateActor(actor, updateData, options, userId),
);

Hooks.on(
  'updateActor',
  (actor: SwadeActor, updateData: any, options: any, userId: string) =>
    SwadeHooks.onUpdateActor(actor, updateData, options, userId),
);

Hooks.on(
  'renderCombatTracker',
  (app: CombatTracker, html: JQuery<HTMLElement>, data: any) =>
    SwadeHooks.onRenderCombatTracker(app, html, data),
);

Hooks.on(
  'updateCombat',
  (combat: Combat, updateData: any, options: any, userId: string) =>
    SwadeHooks.onUpdateCombat(combat, updateData, options, userId),
);

Hooks.on(
  'updateCombatant',
  (
    combat: Combat,
    combatant: any,
    updateData: any,
    options: any,
    userId: string,
  ) =>
    SwadeHooks.onUpdateCombatant(
      combat,
      combatant,
      updateData,
      options,
      userId,
    ),
);

Hooks.on('deleteCombat', (combat: Combat, options: any, userId: string) =>
  SwadeHooks.onDeleteCombat(combat, options, userId),
);

// Add roll data to the message for formatting of dice pools
Hooks.on(
  'renderChatMessage',
  async (chatMessage: ChatMessage, html: JQuery<HTMLElement>, data: any) =>
    SwadeHooks.onRenderChatMessage(chatMessage, html, data),
);

Hooks.on(
  'getChatLogEntryContext',
  (html: JQuery<HTMLElement>, options: any[]) =>
    SwadeHooks.onGetChatLogEntryContext(html, options),
);

Hooks.on('renderChatLog', (app, html: JQuery<HTMLElement>, data) =>
  SwadeHooks.onRenderChatLog(app, html, data),
);

// Add benny management to the player list
Hooks.on('renderPlayerList', async (list: any, html: JQuery, options: any) =>
  SwadeHooks.onRenderPlayerList(list, html, options),
);

Hooks.on('getUserContextOptions', (html: JQuery, context: any[]) =>
  SwadeHooks.onGetUserContextOptions(html, context),
);

Hooks.on('getSceneControlButtons', (sceneControlButtons: any[]) =>
  SwadeHooks.onGetSceneControlButtons(sceneControlButtons),
);

Hooks.on('renderChatPopout', (app, html: JQuery<HTMLElement>, data) =>
  SwadeHooks.onRenderChatLog(app, html, data),
);

Hooks.on('dropActorSheetData', (actor, sheet, data) =>
  SwadeHooks.onDropActorSheetData(actor, sheet, data),
);

Hooks.on(
  'renderCombatantConfig',
  async (app: FormApplication, html: JQuery<HTMLElement>, options: any) =>
    SwadeHooks.onRenderCombatantConfig(app, html, options),
);

Hooks.once('diceSoNiceInit', (dice3d: any) => {
  SwadeHooks.onDiceSoNiceInit(dice3d);
});

Hooks.once('diceSoNiceReady', (dice3d: any) => {
  SwadeHooks.onDiceSoNiceReady(dice3d);
});

Hooks.on('preCreateScene', (createData: any, options: any, userId: string) =>
  SwadeHooks.onPreCreateScene(createData, options, userId),
);
