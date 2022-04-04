/**
 * This is the TypeScript entry file for Foundry VTT.
 * Author: FloRad
 * Content License: All Rights Reserved Pinnacle Entertainment, Inc
 * Software License: Apache License, Version 2.0
 */

import RollDialog from './module/apps/RollDialog';
import SwadeEntityTweaks from './module/apps/SwadeEntityTweaks';
import CharacterSummarizer from './module/CharacterSummarizer';
import { SWADE } from './module/config';
import SwadeActor from './module/documents/actor/SwadeActor';
import Benny from './module/documents/Benny';
import SwadeItem from './module/documents/item/SwadeItem';
import SwadeActiveEffect from './module/documents/SwadeActiveEffect';
import SwadeCards from './module/documents/SwadeCards';
import SwadeCombat from './module/documents/SwadeCombat';
import SwadeCombatant from './module/documents/SwadeCombatant';
import SwadeMeasuredTemplate from './module/documents/SwadeMeasuredTemplate';
import SwadeUser from './module/documents/SwadeUser';
import { registerCustomHelpers } from './module/handlebarsHelpers';
import ItemChatCardHelper from './module/ItemChatCardHelper';
import { listenJournalDrop } from './module/journalDrop';
import * as migrations from './module/migration';
import { preloadHandlebarsTemplates } from './module/preloadTemplates';
import {
  register3DBennySettings,
  registerSettingRules,
  registerSettings,
} from './module/settings';
import CharacterSheet from './module/sheets/official/CharacterSheet';
import SwadeItemSheet from './module/sheets/SwadeItemSheet';
import SwadeNPCSheet from './module/sheets/SwadeNPCSheet';
import SwadeVehicleSheet from './module/sheets/SwadeVehicleSheet';
import SwadeCombatTracker from './module/sidebar/SwadeCombatTracker';
import SwadeHooks from './module/SwadeHooks';
import SwadeSocketHandler from './module/SwadeSocketHandler';
import { createSwadeMacro, rollItemMacro } from './module/util';
import './swade.scss';

/* ------------------------------------ */
/* Initialize system					          */
/* ------------------------------------ */
Hooks.once('init', () => {
  console.log(
    `SWADE | Initializing Savage Worlds Adventure Edition\n${SWADE.ASCII}`,
  );

  // Record Configuration Values
  CONFIG.SWADE = SWADE;

  //set up global game object
  game.swade = {
    sheets: {
      CharacterSheet,
      SwadeItemSheet,
      SwadeNPCSheet,
      SwadeVehicleSheet,
    },
    apps: {
      SwadeEntityTweaks,
    },
    rollItemMacro,
    sockets: new SwadeSocketHandler(),
    migrations: migrations,
    itemChatCardHelper: ItemChatCardHelper,
    CharacterSummarizer,
    RollDialog,
    get SwadeEntityTweaks() {
      console.warn(
        'Please use `game.swade.apps.SwadeEntityTweaks` instead. This accessor is getting deprecated and removed with system version 1.2.0',
      );
      return SwadeEntityTweaks;
    },
  };

  //register custom Handlebars helpers
  registerCustomHelpers();

  //register document classes
  CONFIG.Actor.documentClass = SwadeActor;
  CONFIG.Item.documentClass = SwadeItem;
  CONFIG.Combat.documentClass = SwadeCombat;
  CONFIG.Combatant.documentClass = SwadeCombatant;
  CONFIG.ActiveEffect.documentClass = SwadeActiveEffect;
  CONFIG.User.documentClass = SwadeUser;
  CONFIG.Cards.documentClass = SwadeCards;
  //register custom object classes
  CONFIG.MeasuredTemplate.objectClass = SwadeMeasuredTemplate;
  //register custom sidebar tabs
  CONFIG.ui.combat = SwadeCombatTracker;

  //register card presets
  //@ts-ignore
  CONFIG.Cards.presets = {
    actionDeckLight: {
      label: 'SWADE.ActionDeckPresetLight',
      src: 'systems/swade/cards/action-deck-light.json',
      type: 'deck',
    },
    actionDeckDark: {
      label: 'SWADE.ActionDeckPresetDark',
      src: 'systems/swade/cards/action-deck-dark.json',
      type: 'deck',
    },
  };

  //register custom status effects
  //@ts-ignore
  CONFIG.statusEffects = SWADE.statusEffects;

  //@ts-expect-error Types don't properly recognized dotnotation
  CompendiumCollection.INDEX_FIELDS.Actor.push('data.wildcard');

  //Preload Handlebars templates
  preloadHandlebarsTemplates();

  // Register custom system settings
  registerSettings();
  registerSettingRules();
  register3DBennySettings();

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
    makeDefault: true,
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
});

Hooks.once('ready', SwadeHooks.onReady);
Hooks.once('setup', SwadeHooks.onSetup);
Hooks.on('preCreateItem', SwadeHooks.onPreCreateItem);
Hooks.on('getSceneControlButtons', SwadeHooks.onGetSceneControlButtons);
Hooks.on('dropActorSheetData', SwadeHooks.onDropActorSheetData);
Hooks.on('hotbarDrop', createSwadeMacro);

/* ------------------------------------ */
/* Application Render					          */
/* ------------------------------------ */
Hooks.on('renderCombatantConfig', SwadeHooks.onRenderCombatantConfig);
Hooks.on('renderActiveEffectConfig', SwadeHooks.onRenderActiveEffectConfig);
Hooks.on('renderCompendium', SwadeHooks.onRenderCompendium);
Hooks.on('renderChatMessage', SwadeHooks.onRenderChatMessage);
Hooks.on('renderPlayerList', SwadeHooks.onRenderPlayerList);

/* ------------------------------------ */
/* Sidebar Tab Render					          */
/* ------------------------------------ */
Hooks.on('renderActorDirectory', SwadeHooks.onRenderActorDirectory);
Hooks.on('renderSettings', SwadeHooks.onRenderSettings);
Hooks.on('renderCombatTracker', SwadeHooks.onRenderCombatTracker);
Hooks.on('renderChatLog', SwadeHooks.onRenderChatLog);
Hooks.on('renderChatPopout', SwadeHooks.onRenderChatLog);

/* ------------------------------------ */
/* Context Options    				          */
/* ------------------------------------ */
Hooks.on('getUserContextOptions', SwadeHooks.onGetUserContextOptions);
Hooks.on('getActorEntryContext', SwadeHooks.onGetCombatTrackerEntryContext);
Hooks.on('getChatLogEntryContext', SwadeHooks.onGetChatLogEntryContext);
Hooks.on(
  'getActorDirectoryEntryContext',
  SwadeHooks.onGetActorDirectoryEntryContext,
);
Hooks.on(
  'getCombatTrackerEntryContext',
  SwadeHooks.onGetCombatTrackerEntryContext,
);
Hooks.on(
  'getCardsDirectoryEntryContext',
  SwadeHooks.onGetCardsDirectoryEntryContext,
);
Hooks.on(
  'getCompendiumDirectoryEntryContext',
  SwadeHooks.onGetCompendiumDirectoryEntryContext,
);

/* ------------------------------------ */
/* Dice So Nice Hooks					          */
/* ------------------------------------ */
Hooks.once('diceSoNiceInit', SwadeHooks.onDiceSoNiceInit);
Hooks.once('diceSoNiceReady', SwadeHooks.onDiceSoNiceReady);
