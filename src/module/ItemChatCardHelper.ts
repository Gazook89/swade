import { ItemAction } from '../interfaces/additional';
import IRollOptions from '../interfaces/IRollOptions';
import { SWADE } from './config';
import SwadeActor from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';
import { getTrait, notificationExists } from './util';

/**
 * A helper class for Item chat card logic
 */
export default class ItemChatCardHelper {
  static async onChatCardAction(event): Promise<Roll | null> {
    event.preventDefault();

    // Extract card data
    const button = event.currentTarget;
    button.disabled = true;
    const card = button.closest('.chat-card');
    const messageId = card.closest('.message').dataset.messageId;
    const message = game.messages?.get(messageId)!;
    const action = button.dataset.action;
    const additionalMods = new Array<string | number>();

    //save the message ID if we're doing automated ammo management
    if (game.settings.get('swade', 'ammoManagement')) {
      SWADE['itemCardMessageId'] = messageId;
    }

    // Validate permission to proceed with the roll
    if (!(game.user!.isGM || message.isAuthor)) return null;

    // Get the Actor from a synthetic Token
    const actor = this.getChatCardActor(card);
    if (!actor) return null;

    // Get the Item
    const item = actor.items.get(card.dataset.itemId);
    if (!item) {
      ui.notifications?.error(
        `The requested item ${card.dataset.itemId} does not exist on Actor ${actor.name}`,
      );
      return null;
    }

    //if it's a power and the No Power Points rule is in effect
    if (item.type === 'power' && game.settings.get('swade', 'noPowerPoints')) {
      const ppCost = $(card).find('input.pp-adjust').val() as number;
      let modifier = Math.ceil(ppCost / 2);
      modifier = Math.min(modifier * -1, modifier);
      const actionObj = getProperty(
        item.data,
        `data.actions.additional.${action}.skillOverride`,
      ) as ItemAction;
      if (action === 'formula' || (!!actionObj && actionObj.type === 'skill')) {
        additionalMods.push(modifier.signedString());
      }
    }

    const roll = await this.handleAction(item, actor, action, additionalMods);

    //Only refresh the card if there is a roll and the item isn't a power
    if (roll && item.type !== 'power') await this.refreshItemCard(actor);

    // Re-enable the button
    button.disabled = false;
    return roll;
  }

  static getChatCardActor(card): SwadeActor | null {
    // Case 1 - a synthetic actor from a Token
    const tokenKey = card.dataset.tokenId;
    if (tokenKey) {
      const [sceneId, tokenId] = tokenKey.split('.');
      const scene = game.scenes?.get(sceneId);
      if (!scene) return null;
      const token = scene.tokens.get(tokenId);
      if (!token) return null;
      return token.actor;
    }

    // Case 2 - use Actor ID directory
    const actorId = card.dataset.actorId;
    return game.actors?.get(actorId) ?? null;
  }

  /**
   * Handles the basic skill/damage/reload AND the additional actions
   * @param item
   * @param actor
   * @param action
   */
  static async handleAction(
    item: SwadeItem,
    actor: SwadeActor,
    action: string,
    additionalMods: (string | number)[] = [],
  ): Promise<Roll | null> {
    const traitName = getProperty(item.data, 'data.actions.skill');
    let trait: SwadeItem | string | undefined;
    let roll: Promise<Roll | null> | Roll | null = null;
    const ammo = actor.items.find(
      (i) => i.name === getProperty(item.data, 'data.ammo'),
    );
    const ammoManagement =
      game.settings.get('swade', 'ammoManagement') && !item.isMeleeWeapon;
    const hasAutoReload = getProperty(item.data, 'data.autoReload');

    const canAutoReload = !!ammo && getProperty(ammo, 'data.data.quantity') > 0;
    const enoughShots = getProperty(item.data, 'data.currentShots') < 1;

    const doReload = this.isReloadPossible(actor) && ammoManagement;

    switch (action) {
      case 'damage':
        roll = await item.rollDamage({
          additionalMods: [
            getProperty(item.data, 'data.actions.dmgMod'),
            ...additionalMods,
          ],
        });
        Hooks.call('swadeAction', actor, item, action, roll, game.user!.id);
        break;
      case 'formula':
        //try to get the trait by either matching the attribute name or fetching the skill item
        trait = getTrait(traitName, actor);

        //check if we have anough ammo available
        if (
          (doReload && hasAutoReload && !canAutoReload) ||
          (doReload && !hasAutoReload && enoughShots)
        ) {
          //check to see we're not posting the message twice
          if (!notificationExists('SWADE.NotEnoughAmmo', true)) {
            ui.notifications?.warn(game.i18n.localize('SWADE.NotEnoughAmmo'));
          }
        } else {
          roll = await this.doTraitAction(trait, actor, {
            additionalMods: [
              getProperty(item.data, 'data.actions.skillMod'),
              ...additionalMods,
            ],
          });
        }
        if (roll) await this.subtractShots(actor, item.id!);
        Hooks.call('swadeAction', actor, item, action, roll, game.user!.id);
        break;
      case 'reload':
        if (
          getProperty(item.data, 'data.currentShots') >=
          getProperty(item.data, 'data.shots')
        ) {
          //check to see we're not posting the message twice
          if (!notificationExists('SWADE.ReloadUnneeded', true)) {
            ui.notifications?.info(game.i18n.localize('SWADE.ReloadUnneeded'));
          }
          break;
        }
        await this.reloadWeapon(actor, item);
        await this.refreshItemCard(actor);
        break;
      default:
        roll = await this.handleAdditionalActions(
          item,
          actor,
          action,
          additionalMods,
        );
        // No need to call the hook here, as handleAdditionalActions already calls the hook
        // This is so an external API can directly use handleAdditionalActions to use an action and still fire the hook
        break;
    }
    return roll;
  }

  /**
   * Handles misc actions
   * @param item The item that this action is used on
   * @param actor The actor who has the item
   * @param action The action key
   * @returns the evaluated roll
   */
  static async handleAdditionalActions(
    item: SwadeItem,
    actor: SwadeActor,
    action: string,
    additionalMods: (string | number)[] = [],
  ): Promise<Roll | null> {
    const availableActions = getProperty(item.data, 'data.actions.additional');
    const ammoManagement =
      game.settings.get('swade', 'ammoManagement') && !item.isMeleeWeapon;
    const actionToUse: ItemAction = availableActions[action];

    // if there isn't actually any action then return early
    if (!actionToUse) {
      return null;
    }

    let roll: Promise<Roll> | Roll | null = null;

    if (actionToUse.type === 'skill') {
      //set the trait name and potentially override it via the action
      let traitName = getProperty(item.data, 'data.actions.skill');
      if (actionToUse.skillOverride) traitName = actionToUse.skillOverride;

      //find the trait and either get the skill item or the key of the attribute
      const trait = getTrait(traitName, actor)!;

      let actionSkillMod = '';
      if (actionToUse.skillMod && parseInt(actionToUse.skillMod) !== 0) {
        actionSkillMod = actionToUse.skillMod;
      }
      const currentShots = getProperty(item.data, 'data.currentShots');

      //do autoreload stuff if applicable
      const hasAutoReload = getProperty(item.data, 'data.autoReload');
      const ammo = actor.items.find(
        (i) => i.name === getProperty(item.data, 'data.ammo'),
      );
      const canAutoReload =
        !!ammo && getProperty(ammo.data, 'data.quantity') <= 0;
      if (
        ammoManagement &&
        ((hasAutoReload && !canAutoReload) ||
          (!!actionToUse.shotsUsed && currentShots < actionToUse.shotsUsed))
      ) {
        //check to see we're not posting the message twice
        if (!notificationExists('SWADE.NotEnoughAmmo', true)) {
          ui.notifications?.warn(game.i18n.localize('SWADE.NotEnoughAmmo'));
        }
        return null;
      }
      roll = await this.doTraitAction(trait, actor, {
        flavour: actionToUse.name,
        rof: actionToUse.rof,
        additionalMods: [
          getProperty(item.data, 'data.actions.skillMod'),
          actionSkillMod,
          ...additionalMods,
        ],
      });

      if (roll) {
        await this.subtractShots(actor, item.id!, actionToUse.shotsUsed || 0);
      }
    } else if (actionToUse.type === 'damage') {
      //Do Damage stuff
      roll = await item.rollDamage({
        dmgOverride: actionToUse.dmgOverride,
        flavour: actionToUse.name,
        additionalMods: [
          getProperty(item.data, 'data.actions.dmgMod'),
          actionToUse.dmgMod,
          ...additionalMods,
        ],
      });
    }
    Hooks.call('swadeAction', actor, item, action, roll, game.user!.id);
    return roll;
  }

  static doTraitAction(
    trait: string | SwadeItem | null | undefined,
    actor: SwadeActor,
    options: IRollOptions,
  ): Promise<Roll> | null {
    const rollSkill = trait instanceof SwadeItem || !trait;
    const rollAttribute = typeof trait === 'string';
    if (rollSkill) {
      //get the id from the item or null if there was no trait
      const id = trait instanceof SwadeItem ? trait.id : null;
      return actor.rollSkill(id, options) as Promise<Roll>;
    } else if (rollAttribute) {
      //@ts-ignore
      return actor.rollAttribute(trait, options) as Promise<Roll>;
    } else {
      return null;
    }
  }

  static async subtractShots(
    actor: SwadeActor,
    itemId: string,
    shotsUsed = 1,
  ): Promise<void> {
    const item = actor.items.get(itemId)!;
    const currentShots = parseInt(getProperty(item.data, 'data.currentShots'));
    const hasAutoReload = getProperty(item.data, 'data.autoReload') as boolean;
    const ammoManagement = game.settings.get('swade', 'ammoManagement');
    const doReload = this.isReloadPossible(actor);

    //handle Auto Reload
    if (hasAutoReload) {
      if (!doReload) return;
      const ammo = actor.items.find(
        (i) => i.name === getProperty(item.data, 'data.ammo'),
      )!;
      if (!ammo && !doReload) return;
      const current = getProperty(ammo.data, 'data.quantity');
      const newQuantity = current - shotsUsed;
      await ammo.update({ 'data.quantity': newQuantity });
      //handle normal shot consumption
    } else if (ammoManagement && !!shotsUsed && currentShots - shotsUsed >= 0) {
      await item.update({ 'data.currentShots': currentShots - shotsUsed });
    }
  }

  static async reloadWeapon(actor: SwadeActor, weapon: SwadeItem) {
    const ammoName = getProperty(weapon.data, 'data.ammo') as string;
    const doReload = this.isReloadPossible(actor);

    const ammo = actor.items.find((i: Item) => i.name === ammoName)!;

    //return if there's no ammo set
    if (doReload && !ammoName) {
      if (!notificationExists('SWADE.NoAmmoSet', true)) {
        ui.notifications?.info(game.i18n.localize('SWADE.NoAmmoSet'));
      }
      return;
    }

    const shots = parseInt(getProperty(weapon.data, 'data.shots'));
    let ammoInMagazine = shots;
    const ammoInInventory = getProperty(ammo.data, 'data.quantity') as number;
    const missingAmmo = shots - getProperty(weapon.data, 'data.currentShots');
    let leftoverAmmoInInventory = ammoInInventory - missingAmmo;

    if (doReload) {
      if (!ammo) {
        if (!notificationExists('SWADE.NotEnoughAmmoToReload', true)) {
          ui.notifications?.warn(
            game.i18n.localize('SWADE.NotEnoughAmmoToReload'),
          );
        }
        return;
      }
      if (ammoInInventory < missingAmmo) {
        ammoInMagazine =
          getProperty(weapon.data, 'data.currentShots') + ammoInInventory;
        leftoverAmmoInInventory = 0;
        if (!notificationExists('SWADE.NotEnoughAmmoToReload', true)) {
          ui.notifications?.warn(
            game.i18n.localize('SWADE.NotEnoughAmmoToReload'),
          );
        }
      }

      //update the ammo item
      await ammo.update({
        'data.quantity': leftoverAmmoInInventory,
      });
    }

    //update the weapon
    await weapon.update({ 'data.currentShots': ammoInMagazine });

    //check to see we're not posting the message twice
    if (!notificationExists('SWADE.ReloadSuccess', true)) {
      ui.notifications?.info(game.i18n.localize('SWADE.ReloadSuccess'));
    }
  }

  static async refreshItemCard(actor: SwadeActor, messageId?: string) {
    //get ChatMessage and remove temporarily stored id from CONFIG object
    let message;
    if (messageId) {
      message = game.messages?.get(messageId);
    } else {
      message = game.messages?.get(SWADE['itemCardMessageId']);
      delete SWADE['itemCardMessageId'];
    }
    if (!message) {
      return;
    } //solves for the case where ammo management isn't turned on so there's no errors

    const messageContent = new DOMParser().parseFromString(
      getProperty(message, 'data.content'),
      'text/html',
    );

    const messageData = $(messageContent)
      .find('.chat-card.item-card')
      .first()
      .data();

    const item = actor.items.get(messageData.itemId)!;
    if (item.type === 'weapon') {
      const currentShots = getProperty(item.data, 'data.currentShots');
      const maxShots = getProperty(item.data, 'data.shots');

      //update message content
      $(messageContent)
        .find('.ammo-counter .current-shots')
        .first()
        .text(currentShots);
      $(messageContent).find('.ammo-counter .max-shots').first().text(maxShots);
    }

    if (item.type === 'power') {
      const arcane = getProperty(item.data, 'data.arcane');
      let currentPP = getProperty(actor.data, 'data.powerPoints.value');
      let maxPP = getProperty(actor.data, 'data.powerPoints.max');
      if (arcane) {
        currentPP = getProperty(actor.data, `data.powerPoints.${arcane}.value`);
        maxPP = getProperty(actor.data, `data.powerPoints.${arcane}.max`);
      }
      //update message content
      $(messageContent).find('.pp-counter .current-pp').first().text(currentPP);
      $(messageContent).find('.pp-counter .max-pp').first().text(maxPP);
    }

    //update the message and render the chatlog/chat popout
    await message.update({ content: messageContent.body.innerHTML });
    ui.chat?.render(true);
    for (const appId in message.apps) {
      const app = message.apps[appId] as FormApplication;
      if (app.rendered) {
        app.render(true);
      }
    }
  }

  static isReloadPossible(actor: SwadeActor): boolean {
    const isPC = actor.data.type === 'character';
    const isNPC = actor.data.type === 'npc';
    const isVehicle = actor.data.type === 'vehicle';
    const npcAmmoFromInventory = game.settings.get(
      'swade',
      'npcAmmo',
    ) as boolean;
    const vehicleAmmoFromInventory = game.settings.get(
      'swade',
      'vehicleAmmo',
    ) as boolean;
    const useAmmoFromInventory = game.settings.get(
      'swade',
      'ammoFromInventory',
    ) as boolean;
    return (
      (isVehicle && vehicleAmmoFromInventory) ||
      (isNPC && npcAmmoFromInventory) ||
      (isPC && useAmmoFromInventory)
    );
  }
}
