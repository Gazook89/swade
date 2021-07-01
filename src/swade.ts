/**
 * This is the TypeScript entry file for Foundry VTT.
 * Author: FloRad
 * Content License: All Rights Reserved Pinnacle Entertainment, Inc
 * Software License: Apache License, Version 2.0
 */

import CharacterSummarizer from './module/CharacterSummarizer';
import { getSwadeConeShape } from './module/cone';
import { SWADE } from './module/config';
import SwadeEntityTweaks from './module/dialog/entity-tweaks';
import SwadeActor from './module/documents/actor/SwadeActor';
import Benny from './module/documents/Benny';
import SwadeItem from './module/documents/item/SwadeItem';
import SwadeCombat from './module/documents/SwadeCombat';
import { registerCustomHelpers } from './module/handlebarsHelpers';
import ItemChatCardHelper from './module/ItemChatCardHelper';
import { listenJournalDrop } from './module/journalDrop';
import * as migrations from './module/migration';
import { preloadHandlebarsTemplates } from './module/preloadTemplates';
import { registerSettingRules, registerSettings } from './module/settings';
import CharacterSheet from './module/sheets/official/CharacterSheet';
import SwadeItemSheet from './module/sheets/SwadeItemSheet';
import SwadeNPCSheet from './module/sheets/SwadeNPCSheet';
import SwadeVehicleSheet from './module/sheets/SwadeVehicleSheet';
import SwadeCombatTracker from './module/sidebar/SwadeCombatTracker';
import SwadeHooks from './module/SwadeHooks';
import SwadeSocketHandler from './module/SwadeSocketHandler';
import {
  createSwadeMacro,
  rollItemMacro,
  rollPowerMacro,
  rollSkillMacro,
  rollWeaponMacro,
} from './module/util';

/* ------------------------------------ */
/* Initialize system					          */
/* ------------------------------------ */

const sockets: SwadeSocketHandler = null;
export const swadeGame = {
  SwadeEntityTweaks,
  rollSkillMacro,
  rollWeaponMacro,
  rollPowerMacro,
  rollItemMacro,
  sockets: sockets,
  itemChatCardHelper: ItemChatCardHelper,
  migrations: migrations,
  CharacterSummarizer,
};
Hooks.once('init', () => {
  console.log(
    `SWADE | Initializing Savage Worlds Adventure Edition\n${SWADE.ASCII}`,
  );

  // Record Configuration Values
  //CONFIG.debug.hooks = true;
  CONFIG.SWADE = SWADE;

  game.swade = swadeGame;
  game.swade.sockets = new SwadeSocketHandler();
  //Register custom Handlebars helpers
  registerCustomHelpers();

  //Overwrite method prototypes
  //@ts-expect-error I'm not extending this class and just altering the shape so overwriting the prototype is the easiest way of doing things
  MeasuredTemplate.prototype._getConeShape = getSwadeConeShape;

  // Register custom classes

  CONFIG.Actor.documentClass = SwadeActor;

  CONFIG.Item.documentClass = SwadeItem;

  CONFIG.Combat.documentClass = SwadeCombat;
  CONFIG.statusEffects = SWADE.statusEffects;
  CONFIG.ui.combat = SwadeCombatTracker;

  //TODO: Will require Foundry 0.8.8

  //CompendiumCollection.INDEX_FIELDS.JournalEntry.push('data.flags.swade');

  // Register custom system settings
  registerSettings();
  registerSettingRules();

  // Register sheets
  Actors.unregisterSheet('core', ActorSheet);
  Items.unregisterSheet('core', ItemSheet);

  Actors.registerSheet('swade', CharacterSheet, {
    types: ['character'],
    makeDefault: true,
    label: 'SWADE.OfficialSheet',
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

Hooks.once('setup', () => SwadeHooks.onSetup());

Hooks.once('ready', async () => SwadeHooks.onReady());

/**
 * This hook only really exists to stop Races from being added to the actor as an item
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
Hooks.on('preCreateItem', (item, options, userId) => {
  if (
    item.parent &&
    item.data.type === 'ability' &&
    item.data.data.subtype === 'race'
  ) {
    return false; //return early if we're doing race stuff
  }
});

Hooks.on(
  'renderActorDirectory',
  (app: ActorDirectory, html: JQuery<HTMLElement>, options: any) =>
    SwadeHooks.onRenderActorDirectory(app, html, options),
);

Hooks.on(
  'renderCompendium',
  (app: Compendium, html: JQuery<HTMLElement>, data: any) =>
    SwadeHooks.onRenderCompendium(app, html, data),
);

Hooks.on(
  'updateActor',
  (actor: SwadeActor, updateData: any, options: any, userId: string) =>
    SwadeHooks.onUpdateActor(actor, updateData, options, userId),
);

Hooks.on(
  'renderCombatTracker',
  (app: SwadeCombatTracker, html: JQuery<HTMLElement>, data: any) =>
    SwadeHooks.onRenderCombatTracker(app, html, data),
);

//TODO move to combatant class later?
Hooks.on(
  'updateCombatant',
  (combatant: any, updateData: any, options: any, userId: string) =>
    SwadeHooks.onUpdateCombatant(combatant, updateData, options, userId),
);

// Add roll data to the message for formatting of dice pools
Hooks.on(
  'renderChatMessage',
  (message: ChatMessage, html: JQuery<HTMLElement>, data: any) =>
    SwadeHooks.onRenderChatMessage(message, html, data),
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
  (app: FormApplication, html: JQuery<HTMLElement>, options: any) =>
    SwadeHooks.onRenderCombatantConfig(app, html, options),
);

Hooks.once('diceSoNiceInit', (dice3d: any) => {
  SwadeHooks.onDiceSoNiceInit(dice3d);
});

Hooks.once('diceSoNiceReady', (dice3d: any) => {
  SwadeHooks.onDiceSoNiceReady(dice3d);
});

Hooks.on('hotbarDrop', (bar, data, slot) => createSwadeMacro(data, slot));

Hooks.on('getCombatTrackerEntryContext', (html, options) => {
  SwadeHooks.onGetCombatTrackerEntryContext(html, options);
});

Hooks.on('getCompendiumDirectoryEntryContext', (html, options) => {
  SwadeHooks.onGetCompendiumDirectoryEntryContext(html, options);
});
// static INDEX_FIELDS = {
//   Actor: ["name", "img", "type"],
//   Item: ["name", "img", "type"],
//   Scene: ["name", "thumb"],
//   JournalEntry: ["name", "img"],
//   Macro: ["name", "img"],
//   RollTable: ["name", "img"],
//   Playlist: ["name"]
// }
