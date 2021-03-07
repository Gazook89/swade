import { SWADE } from './config';
import SwadeItem from './entities/SwadeItem';

export async function createActionCardTable(
  rebuild?: boolean,
  cardpack?: string,
): Promise<void> {
  let packName = game.settings.get('swade', 'cardDeck');
  if (cardpack) {
    packName = cardpack;
  }
  const cardPack = game.packs.get(packName) as Compendium;
  const cardPackIndex = await cardPack.getIndex();
  let cardTable = game.tables.getName(SWADE.init.cardTable);

  //If the table doesn't exist, create it
  if (!cardTable) {
    const tableData = {
      img: 'systems/swade/assets/ui/wildcard.svg',
      name: SWADE.init.cardTable,
      replacement: false,
      displayRoll: false,
    };
    const tableOptions = { temporary: false, renderSheet: false };
    cardTable = (await RollTable.create(tableData, tableOptions)) as RollTable;
  }

  //If it's a rebuild call, delete all entries and then repopulate them
  if (rebuild) {
    const deletions = cardTable.results.map((i) => i._id) as string[];
    await cardTable.deleteEmbeddedEntity('TableResult', deletions);
  }

  const createData = [];
  for (let i = 0; i < cardPackIndex.length; i++) {
    const c = cardPackIndex[i] as any;
    const resultData = {
      type: 2, //Set type to compendium
      text: c.name,
      img: c.img,
      collection: packName, // Name of the compendium
      resultId: c.id, //Id of the entry inside the compendium
      weight: 1,
      range: [i + 1, i + 1],
    };
    createData.push(resultData);
  }
  await cardTable.createEmbeddedEntity('TableResult', createData);
  await cardTable.normalize();
  ui.tables.render();
}

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
export async function createSwadeMacro(data: any, slot: number) {
  if (data.type !== 'Item') return;
  if (!('data' in data))
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items',
    );
  const item = data.data;
  let command: string;
  // Create the macro command
  switch (item.type) {
    case 'skill':
      command = `game.swade.rollSkillMacro("${item.name}");`;
      break;
    case 'weapon':
      command = `game.swade.rollWeaponMacro("${item.name}");`;
      break;
    case 'power':
      command = `game.swade.rollPowerMacro("${item.name}");`;
      break;
    default:
      break;
  }
  const macro = (await Macro.create({
    name: item.name,
    type: 'script',
    img: item.img,
    command: command,
  })) as Macro;

  await game.user.assignHotbarMacro(macro, slot);
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} skillName
 * @return {Promise}
 */
export function rollSkillMacro(skillName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item: SwadeItem = actor
    ? actor.items.find((i) => i.name === skillName)
    : null;
  if (!item)
    return ui.notifications.warn(
      `Your controlled Actor does not have the skill ${skillName}`,
    );

  // Trigger the item roll
  return actor.rollSkill(item.id);
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} skillName
 * @return {Promise}
 */
export function rollWeaponMacro(weaponName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item: SwadeItem = actor
    ? actor.items.find((i) => i.name === weaponName)
    : null;
  if (!item)
    return ui.notifications.warn(
      `Your controlled Actor does not have an item named ${weaponName}`,
    );

  return item.rollDamage();
}

export function rollPowerMacro(powerName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item: SwadeItem = actor
    ? actor.items.find((i) => i.name === powerName)
    : null;
  if (!item)
    return ui.notifications.warn(
      `Your controlled Actor does not have an item named ${powerName}`,
    );

  // Trigger the item roll
  if (item.data.data['damage']) {
    return item.rollDamage();
  }
  return;
}

/**
 *
 * @param string The string to look for
 * @param localize Switch which determines if the string is a localization key
 */
export function notificationExists(string: string, localize = false): boolean {
  let stringToFind = string;
  if (localize) stringToFind = game.i18n.localize(string);
  return ui.notifications.active.some((n) => n.text() === stringToFind);
}

export async function shouldShowBennyAnimation(): Promise<boolean> {
  const value = game.user.getFlag('swade', 'dsnShowBennyAnimation') as boolean;
  const defaultValue = getProperty(
    SWADE,
    'diceConfig.flags.dsnShowBennyAnimation.default',
  ) as boolean;

  if (typeof value === 'undefined') {
    await game.user.setFlag('swade', 'dsnShowBennyAnimation', defaultValue);
    return defaultValue;
  } else {
    return value;
  }
}

export function getCanvas(): Canvas {
  if (canvas instanceof Canvas) {
    return canvas;
  }
  throw new Error('No Canvas available');
}
