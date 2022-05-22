import { TraitRollModifier } from '../interfaces/additional';
import { SWADE } from './config';
import { constants } from './constants';
import SwadeActor from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';

/**
 * A simple function to allow quick access to an item such as a skill or weapon. Skills are rolled while other items are posted to the chat as a chatcard
 * @param itemName the name of the item that should be called
 */
export function rollItemMacro(itemName: string) {
  const speaker = ChatMessage.getSpeaker();
  let actor: SwadeActor | undefined = undefined;
  if (speaker.token) actor = game.actors?.tokens[speaker.token];
  if (!actor && speaker.actor) actor = game.actors?.get(speaker.actor);
  if (!actor || !actor.isOwner) {
    return null;
  }
  const item = actor.items.getName(itemName);
  if (!item) {
    ui.notifications.warn(
      `Your controlled Actor does not have an item named ${itemName}`,
    );
    return null;
  }
  //Roll the skill
  if (item.data.type === 'skill') {
    return item.roll();
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
  const active = ui.notifications.active || [];
  return active.some((n) => n.text() === stringToFind);
}

export async function shouldShowBennyAnimation(): Promise<boolean> {
  const value = game.user?.getFlag('swade', 'dsnShowBennyAnimation');
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

//TODO Revisit if still necessary or if this could be done better
export function getCanvas(): Canvas {
  if (canvas instanceof Canvas && canvas.ready) {
    return canvas!;
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

export async function resetActionDeck() {
  const deck = game.cards?.get(game.settings.get('swade', 'actionDeck'));
  await deck?.reset({ chatNotification: false });
  await deck?.shuffle({ chatNotification: false });
}

/**
 * A generic reducer function that can be used to reduce an array of trait roll modifiers into a string that can be parsed by the Foundry VTT Roll class
 * @param acc The accumulator string
 * @param cur The current trait roll modifier
 * @returns A string which contains all trait roll modifiers, reduced into a parsable string
 */
export function modifierReducer(acc: string, cur: TraitRollModifier): string {
  return (acc += `${cur.value}[${cur.label}]`);
}

export function firstOwner(doc) {
  /* null docs could mean an empty lookup, null docs are not owned by anyone */
  if (!doc) return null;
  const permissions: Permissions = doc.data.permission ?? {};
  const playerOwners = Object.entries(permissions)
    .filter(([id, level]) => {
      const user = game.users?.get(id);
      return (
        user?.active &&
        !user.isGM &&
        level === CONST.DOCUMENT_PERMISSION_LEVELS.OWNER
      );
    })
    .map(([id, _level]) => id);

  if (playerOwners.length > 0) {
    return game.users?.get(playerOwners[0]);
  }

  /* if no online player owns this actor, fall back to first GM */
  return firstGM();
}

/* Players first, then GM */
export function isFirstOwner(doc) {
  return game.userId === firstOwner(doc)?.id;
}

export function firstGM() {
  return game.users?.find((u) => u.isGM && u.active);
}

export function isFirstGM() {
  return game.userId !== firstGM()?.id;
}

export function getRankFromAdvance(advance: number): number {
  if (advance <= 3) {
    return constants.RANK.NOVICE;
  } else if (advance.between(4, 7)) {
    return constants.RANK.SEASONED;
  } else if (advance.between(8, 11)) {
    return constants.RANK.VETERAN;
  } else if (advance.between(12, 15)) {
    return constants.RANK.HEROIC;
  } else {
    return constants.RANK.LEGENDARY;
  }
}

export function getRankFromAdvanceAsString(advance: number): string {
  return SWADE.ranks[getRankFromAdvance(advance)];
}

type Permissions = Record<string, number>;
