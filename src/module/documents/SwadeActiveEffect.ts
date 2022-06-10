import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import {
  ActiveEffectDataConstructorData,
  ActiveEffectDataProperties,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/activeEffectData';
import { EffectChangeData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/effectChangeData';
import { BaseUser } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs';
import { PropertiesToSource } from '@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes';
import { constants } from '../constants';
import { isFirstOwner } from '../util';
import SwadeActor from './actor/SwadeActor';
import SwadeItem from './item/SwadeItem';

declare global {
  interface DocumentClassConfig {
    ActiveEffect: typeof SwadeActiveEffect;
  }
  interface FlagConfig {
    ActiveEffect: {
      swade: {
        removeEffect?: boolean;
        expiration?: number;
        loseTurnOnHold?: boolean;
        favorite?: boolean;
      };
    };
  }
}

export default class SwadeActiveEffect extends ActiveEffect {
  get changes() {
    return this.data.changes;
  }

  get affectsItems() {
    if (this.parent instanceof CONFIG.Actor.documentClass) {
      const affectedItems = new Array<SwadeItem>();
      this.changes.forEach((c) =>
        affectedItems.push(
          ...this._getAffectedItems(this.parent as SwadeActor, c),
        ),
      );
      return affectedItems.length > 0;
    }
    return false;
  }

  get expiresAtStartOfTurn(): boolean {
    const expiration = this.getFlag('swade', 'expiration') ?? -1;
    return [
      constants.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto,
      constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt,
    ].includes(expiration);
  }

  get expiresAtEndOfTurn(): boolean {
    const expiration = this.getFlag('swade', 'expiration') ?? -1;
    return [
      constants.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto,
      constants.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt,
    ].includes(expiration);
  }

  static ITEM_REGEXP = /@([a-zA-Z0-9]+)\{(.+)\}\[([\S.]+)\]/;

  override apply(actor: SwadeActor, change: EffectChangeData) {
    const match = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
    if (match) {
      //get the properties from the match
      const key: string = match[3].trim();
      const value = change.value;
      //get the affected items
      const affectedItems = this._getAffectedItems(actor, change);
      //apply the AE to each item
      for (const item of affectedItems) {
        const overrides = foundry.utils.flattenObject(item.overrides);
        overrides[key] = Number.isNumeric(value) ? Number(value) : value;
        //mock up a new change object with the key and value we extracted from the original key and feed it into the super apply method alongside the item
        const mockChange = { ...change, key, value };
        //@ts-expect-error It normally expects an Actor but since it only targets the data we can re-use it for Items
        super.apply(item, mockChange);
        item.overrides = foundry.utils.expandObject(overrides);
      }
    } else {
      return super.apply(actor, change);
    }
  }

  private _getAffectedItems(actor: SwadeActor, change: EffectChangeData) {
    const items = new Array<SwadeItem>();
    const match = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
    if (match) {
      //get the properties from the match
      const type: string = match[1].trim().toLowerCase();
      const name: string = match[2].trim();
      //filter the items down, according to type and name/id
      items.push(
        ...actor.items.filter(
          (i) => i.type === type && (i.name === name || i.id === name),
        ),
      );
    }
    return items;
  }

  /**
   * Removes Effects from Items
   * @param parent The parent object
   */
  private _removeEffectsFromItems(parent: SwadeActor) {
    const affectedItems = new Array<SwadeItem>();
    this.changes.forEach((c) =>
      affectedItems.push(...this._getAffectedItems(parent, c)),
    );
    for (const item of affectedItems) {
      const overrides = foundry.utils.flattenObject(item.overrides);
      for (const change of this.changes) {
        const match = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
        if (match) {
          const key = match[3].trim();
          //delete override
          delete overrides[key];
          //restore original data from source
          const source = getProperty(item.data._source, key);
          setProperty(item.data, key, source);
        }
      }
      item.overrides = foundry.utils.expandObject(overrides);
      if (item.sheet?.rendered) item.sheet.render(true);
    }
  }

  /** This functions checks the effect expiration behavior and either auto-deletes or prompts for deletion */
  async expire() {
    if (!isFirstOwner(this.parent)) {
      return game.swade.sockets.removeStatusEffect(this.uuid);
    }

    const statusId = this.getFlag('core', 'statusId') ?? '';
    if (game.swade.effectCallbacks.has(statusId)) {
      const callbackFn = game.swade.effectCallbacks.get(statusId, {
        strict: true,
      });
      return callbackFn(this);
    }

    const expiration = this.getFlag('swade', 'expiration');
    const startOfTurnAuto =
      expiration === constants.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto;
    const startOfTurnPrompt =
      expiration === constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt;
    const endOfTurnAuto =
      expiration === constants.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto;
    const endOfTurnPrompt =
      expiration === constants.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt;
    const auto = startOfTurnAuto || endOfTurnAuto;
    const prompt = startOfTurnPrompt || endOfTurnPrompt;

    if (auto) {
      await this.delete();
    } else if (prompt) {
      this.promptEffectDeletion();
    }
  }

  isExpired(pointInTurn: 'start' | 'end'): boolean {
    const isRightPointInTurn =
      (pointInTurn === 'start' && this.expiresAtStartOfTurn) ||
      (pointInTurn === 'end' && this.expiresAtEndOfTurn);
    const remaining = this.duration.remaining ?? 0;
    return isRightPointInTurn && remaining < 1;
  }

  /** @deprecated */
  async removeEffect() {
    await this.expire();
  }

  async promptEffectDeletion() {
    const title = game.i18n.format('SWADE.RemoveEffectTitle', {
      label: this.data.label,
    });
    const content = game.i18n.format('SWADE.RemoveEffectBody', {
      label: this.data.label,
      parent: this.parent?.name,
    });
    const buttons: Record<string, Dialog.Button> = {
      yes: {
        label: game.i18n.localize('Yes'),
        icon: '<i class="fas fa-check"></i>',
        callback: () => this.delete(),
      },
      no: {
        label: game.i18n.localize('No'),
        icon: '<i class="fas fa-times"></i>',
      },
      reset: {
        label: game.i18n.localize('SWADE.ActiveEffects.ResetDuration'),
        icon: '<i class="fas fa-repeat"></i>',
        callback: async () => {
          await this.resetDuration();
        },
      },
    };
    new Dialog({ title, content, buttons }).render(true);
  }

  async resetDuration() {
    const currentRound = game.combat?.round ?? 1;
    await this.update({ 'duration.startRound': currentRound });
  }

  protected override async _onUpdate(
    changed: PropertiesToSource<ActiveEffectDataProperties>,
    options: DocumentModificationOptions,
    userId: string,
  ) {
    await super._onUpdate(changed, options, userId);
    if (this.getFlag('swade', 'loseTurnOnHold')) {
      const combatant = game.combat?.combatants.find(
        (c) => c.actor?.id === this.parent?.id,
      );
      if (combatant?.getFlag('swade', 'roundHeld')) {
        await combatant?.setFlag('swade', 'turnLost', true);
        await combatant?.unsetFlag('swade', 'roundHeld');
      }
    }
  }

  protected override async _preUpdate(
    changed: ActiveEffectDataConstructorData,
    options: DocumentModificationOptions,
    user: User,
  ) {
    super._preUpdate(changed, options, user);
    //return early if the parent isn't an actor or we're not actually affecting items
    if (
      this.affectsItems &&
      this.parent instanceof CONFIG.Actor.documentClass
    ) {
      this._removeEffectsFromItems(this.parent);
    }
  }

  protected override async _preDelete(
    options: DocumentModificationOptions,
    user: User,
  ) {
    super._preDelete(options, user);
    const parent = this.parent;
    //remove the effects from the item
    if (this.affectsItems && parent instanceof CONFIG.Actor.documentClass) {
      this._removeEffectsFromItems(parent);
    }
  }

  protected override async _preCreate(
    data: ActiveEffectDataConstructorData,
    options: DocumentModificationOptions,
    user: BaseUser,
  ): Promise<void> {
    super._preCreate(data, options, user);

    //localize labels, just to be sure
    const label = game.i18n.localize(this.data.label);
    this.data.update({ label: label });

    //automatically favorite status effects
    if (data.flags?.core?.statusId) {
      this.data.update({ 'flags.swade.favorite': true });
    }

    // If there's no duration value and there's a combat, at least set the combat ID which then sets a startRound and startTurn, too.
    if (!data.duration?.combat && game.combat) {
      this.data.update({ 'duration.combat': game.combat.id });
    }

    //set the world time at creation
    this.data.update({ duration: { startTime: game.time.worldTime } });

    if (this.getFlag('swade', 'loseTurnOnHold')) {
      const combatant = game.combat?.combatants.find(
        (c) => c.actor?.id === this.parent?.id,
      );
      if (combatant?.getFlag('swade', 'roundHeld')) {
        await Promise.all([
          combatant?.setFlag('swade', 'turnLost', true),
          combatant?.unsetFlag('swade', 'roundHeld'),
        ]);
      }
    }
  }
}
