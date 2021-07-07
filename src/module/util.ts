import { SWADE } from './config';
import SwadeActor from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';

export async function createActionCardTable(
  rebuild?: boolean,
  cardpack?: string,
): Promise<void> {
  let packName = game.settings.get('swade', 'cardDeck') as string;
  if (cardpack) {
    packName = cardpack;
  }
  const cardPack = game.packs?.get(packName)!;
  let cardTable = game.tables?.getName(SWADE.init.cardTable)!;

  //If the table doesn't exist, create it
  if (!cardTable) {
    const tableData = {
      img: 'systems/swade/assets/ui/wildcard.svg',
      name: SWADE.init.cardTable,
      replacement: false,
      displayRoll: false,
    };
    cardTable = (await RollTable.create(tableData, {
      renderSheet: false,
    })) as RollTable;
  }

  //If it's a rebuild call, delete all entries and then repopulate them
  if (rebuild) {
    //@ts-ignore
    const deletions = cardTable.results.map((i) => i.id);
    await cardTable.deleteEmbeddedDocuments('TableResult', deletions);
  }

  const createData = Array.from(cardPack.index.values()).map((c, i) => {
    return {
      type: CONST.TABLE_RESULT_TYPES.COMPENDIUM,
      //@ts-ignore
      text: c.name,
      //@ts-ignore
      img: c.img,
      collection: packName, // Name of the compendium
      //@ts-ignore
      resultId: c.id, //Id of the entry inside the compendium
      weight: 1,
      range: [i + 1, i + 1],
    };
  });

  await cardTable.createEmbeddedDocuments('TableResult', createData);
  //@ts-ignore
  await cardTable.normalize();
  await ui.tables?.render(true);
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
export async function createSwadeMacro(data: Hotbar.DropData, slot: string) {
  if (data.type !== 'Item') return;
  if (!('data' in data))
    return ui.notifications?.warn(
      'You can only create macro buttons for owned Items',
    );
  const item = data.data;
  // Create the macro command
  const command = `game.swade.rollItemMacro("${item?.name}");`;
  const macro = (await Macro.create({
    name: item?.name!,
    type: 'script',
    img: item?.img!,
    command: command,
  })) as Macro;
  await game.user?.assignHotbarMacro(macro, slot);
}

/**
 *
 * @param itemName
 * @returns
 */
export function rollItemMacro(itemName: string) {
  const speaker = ChatMessage.getSpeaker();
  let actor: SwadeActor | undefined = undefined;
  if (speaker.token) actor = game.actors?.tokens[speaker.token];
  if (!actor) actor = game.actors?.get(speaker.actor!);
  if (!actor || !actor.isOwner) {
    return null;
  }
  const item = actor.items.getName(itemName);
  if (!item) {
    ui.notifications?.warn(
      `Your controlled Actor does not have an item named ${itemName}`,
    );
    return null;
  }
  //Roll the skill
  if (item.type === 'skill') {
    return actor.rollSkill(item.id!);
  } else {
    // Show the item
    return item.show();
  }
}

/**
 *
 * @param string The string to look for
 * @param localize Switch which determines if the string is a localization key
 */
export function notificationExists(string: string, localize = false): boolean {
  let stringToFind = string;
  if (localize) stringToFind = game.i18n.localize(string);
  const active = ui.notifications?.active || [];
  return active.some((n) => n.text() === stringToFind);
}

export async function shouldShowBennyAnimation(): Promise<boolean> {
  const value = game.user?.getFlag('swade', 'dsnShowBennyAnimation') as boolean;
  const defaultValue = getProperty(
    SWADE,
    'diceConfig.flags.dsnShowBennyAnimation.default',
  ) as boolean;

  if (typeof value === 'undefined') {
    await game.user?.setFlag('swade', 'dsnShowBennyAnimation', defaultValue);
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

/**
 *
 * @param traitName The name of the trait to be found
 * @param actor The actor to find it from
 * @returns Returns a string of the trait name in the data model if it's an attribute or an Item if it is a skill. If it can find neither an attribute nor a skill then it returns null
 */
export function getTrait(
  traitName: string,
  actor: SwadeActor,
): SwadeItem | string | undefined {
  let trait: SwadeItem | string | undefined = undefined;
  for (const attr of Object.keys(SWADE.attributes)) {
    const attributeName = game.i18n.localize(SWADE.attributes[attr].long);
    if (attributeName === traitName) {
      trait = attr;
    }
  }
  if (!trait) {
    trait = actor.items.find((i) => i.type === 'skill' && i.name === traitName);
  }
  return trait;
}
