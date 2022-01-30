import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import { ActiveEffectDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/activeEffectData';
import { EffectChangeData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/effectChangeData';
import { BaseUser } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs';
import { StatusEffectExpiration } from '../enums/StatusEffectExpirationsEnums';
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

  static ITEM_REGEXP = /@([a-zA-Z0-9]+){([^.]+)}\[([a-zA-Z0-9.]+)\]/;

  /** @override */
  apply(actor: SwadeActor, change: EffectChangeData) {
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

  /**
   * Determines whether to remove a statusEffect during a given round based on its duration and expiration
   * @param combatId The ID string of the current combat
   */
  async checkStatusEffect(combatId: string) {
    // Get the expiration of the effect
    const expiration = this.getFlag('swade', 'expiration');
    // If there's a the effect duration's combat is the combat ID passed in, start processing the effect.
    if (combatId === this.data.duration.combat) {
      // Get the combat object
      const combat = game.combats?.get(combatId);
      // If the combat object exists (it should) and there's an expiration on the effect, process the expiration of the effect.
      if (combat && expiration) {
        // If the effect expires at the end of a turn, do this stuff.
        if (
          expiration === StatusEffectExpiration.END_OF_TURN_AUTO ||
          expiration === StatusEffectExpiration.END_OF_TURN_PROMPT
        ) {
          // Get the previous turn so you know who's turn just ended.
          const previousTurn = combat.turn - 1;
          // If it's the first turn in a new round, we have no context of which combatant went last in the previous round, so we check for a marker 'removeEffect'
          if (combat.turn === 0 && this.getFlag('swade', 'removeEffect')) {
            if (expiration === StatusEffectExpiration.END_OF_TURN_AUTO) {
              await this.delete();
            } else if (
              expiration === StatusEffectExpiration.END_OF_TURN_PROMPT
            ) {
              // TODO: trigger prompt based on effect
              this._promptEffectDeletion();
            }
          } else {
            // Only if previous turn isn't less than 0...
            if (previousTurn >= 0) {
              // Check the effect duration's start turn and start round
              const startRound = this.data.duration.startRound ?? 0;
              const startTurn = this.data.duration.startTurn ?? 0;
              const previousTurn = combat.turns[combat.turn - 1];
              // If the duration start was prior to the previous turn...
              if (
                previousTurn.actor?.id === this.parent?.id &&
                ((startRound === combat.round && startTurn < combat.turn - 1) ||
                  startRound < combat.round)
              ) {
                // Process the end of the effect
                if (expiration === StatusEffectExpiration.END_OF_TURN_AUTO) {
                  await this.delete();
                } else if (
                  expiration === StatusEffectExpiration.END_OF_TURN_PROMPT
                ) {
                  // TODO: trigger prompt based on effect
                  this._promptEffectDeletion();
                }
              }
            }
          }
        }
      }

      // If this is the last turn of a round, and it had an AE that's supposed to expire at the end of this turn...
      if (combat && combat.turn === combat.turns.length - 1) {
        if (combat.combatant.actor?.effects.size) {
          const startRound = this.data.duration.startRound ?? 0;
          const startTurn = this.data.duration.startTurn ?? 0;
          if (
            expiration === StatusEffectExpiration.END_OF_TURN_AUTO ||
            expiration === StatusEffectExpiration.END_OF_TURN_PROMPT
          ) {
            if (
              combat.combatant.actor.id === this.parent?.id &&
              startRound === combat.round &&
              startTurn < combat.turn
            ) {
              // Mark it to be deleted or prompted at the start of the next round.
              await this.setFlag('swade', 'removeEffect', true);
            }
          }
        }
      }
    }
  }

  protected _promptEffectDeletion() {
    Dialog.confirm({
      defaultYes: false,
      title: `Delete ${this.name} ?`,
      content: `<p>Delete ${this.name} ?</p>`,
      yes: () => {
        this.delete();
      },
    });
  }

  protected async _preUpdate(
    changed: DeepPartial<ActiveEffectDataConstructorData>,
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

  protected async _preDelete(options: DocumentModificationOptions, user: User) {
    super._preDelete(options, user);
    const parent = this.parent;
    //remove the effects from the item
    if (this.affectsItems && parent instanceof CONFIG.Actor.documentClass) {
      this._removeEffectsFromItems(parent);
    }
  }

  protected async _preCreate(
    data: ActiveEffectDataConstructorData,
    options: DocumentModificationOptions,
    user: BaseUser,
  ): Promise<void> {
    super._preCreate(data, options, user);
    const label = game.i18n.localize(this.data.label);
    this.data.update({ label: label });

    // If there's no duration value and there's a combat, at least set the combat ID which then sets a startRound and startTurn, too.
    if (!data.duration && game.combat) {
      this.data.update({ 'duration.combat': game.combat.id });
    }

    if (this.getFlag('swade', 'loseTurnOnHold')) {
      const combatant = game.combat?.combatants.find(
        (c) => c.actor?.id === this.parent?.id,
      );
      await combatant?.setFlag('swade', 'turnLost', true);
      await combatant?.unsetFlag('swade', 'roundHeld');
    }
  }
}
