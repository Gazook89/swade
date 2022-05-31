import SwadeCombatant from '../documents/SwadeCombatant';
import * as utils from '../util';

/**
 * This class defines a a new Combat Tracker specifically designed for SWADE
 */
export default class SwadeCombatTracker extends CombatTracker {
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      template: 'systems/swade/templates/sidebar/combat-tracker.hbs',
    };
  }
  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);

    //make combatants draggable for GMs
    html
      .find('#combat-tracker li.combatant')
      .each((i: number, li: HTMLLIElement) => {
        const id = li.dataset.combatantId!;
        const comb = this.viewed?.combatants.get(id, { strict: true });
        if (comb?.actor?.isOwner || game.user?.isGM) {
          // Add draggable attribute and dragstart listener.
          li.setAttribute('draggable', 'true');
          li.classList.add('draggable');
          //On dragStart
          li.addEventListener('dragstart', this._onDragStart, false);
          // On dragOver
          li.addEventListener('dragover', (e) =>
            $(e.target!).closest('li.combatant').addClass('dropTarget'),
          );
          // On dragleave
          li.addEventListener('dragleave', (e) =>
            $(e.target!).closest('li.combatant').removeClass('dropTarget'),
          );
        }
      });

    html
      .find('.combatant-control')
      .on('click', this._onCombatantControl.bind(this));
    html
      .find('.combat-control[data-control=resetDeck]')
      .on('click', this._onResetActionDeck.bind(this));
  }

  async getData(): Promise<CombatTracker.Data> {
    const data = await super.getData();
    for (const turn of data.turns as CombatTracker.Turn[]) {
      const combatant = this.viewed?.combatants.get(turn.id, { strict: true });
      foundry.utils.setProperty(turn, 'cardString', combatant?.cardString);
      foundry.utils.setProperty(turn, 'roundHeld', combatant?.roundHeld);
      foundry.utils.setProperty(turn, 'turnLost', combatant?.turnLost);
      const dontShow = !!combatant?.groupId || combatant?.data.defeated;
      foundry.utils.setProperty(turn, 'emptyInit', dontShow);
    }
    return data;
  }

  // Reset the Action Deck
  async _onResetActionDeck(event) {
    event.stopImmediatePropagation();
    await utils.resetActionDeck();
    ui.notifications.info('SWADE.ActionDeckResetNotification', {
      localize: true,
    });
  }
  async _onCombatantControl(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const btn = event.currentTarget;
    const li = btn.closest('.combatant');
    const c = this.viewed!.combatants.get(li.dataset.combatantId)!;
    // Switch control action
    switch (btn.dataset.control) {
      // Toggle combatant defeated flag to reallocate potential followers.
      case 'toggleDefeated':
        return this._onToggleDefeatedStatus(c);
      // Toggle combatant roundHeld flag
      case 'toggleHold':
        return this._onToggleHoldStatus(c);
      // Toggle combatant turnLost flag
      case 'toggleLostTurn':
        return this._onToggleTurnLostStatus(c);
      // Toggle combatant turnLost flag
      case 'actNow':
        return this._onActNow(c);
      // Toggle combatant turnLost flag
      case 'actAfter':
        return this._onActAfterCurrentCombatant(c);
      default:
        return super._onCombatantControl(event);
    }
  }
  // Toggle Defeated and reallocate followers
  async _onToggleDefeatedStatus(c: SwadeCombatant) {
    await super._onToggleDefeatedStatus(c);
    if (c.isGroupLeader) {
      const newLeader = await this.viewed!.combatants.find(
        (f) => f.groupId === c.id && !f.data.defeated,
      )!;
      await newLeader.update({
        flags: {
          swade: {
            '-=groupId': null,
            isGroupLeader: true,
          },
        },
      });
      const followers = await this._getFollowers(c);
      for (const f of followers) {
        await f.setGroupId(newLeader.id!);
      }
      await c.unsetIsGroupLeader();
    }
    if (c.groupId) {
      await c.unsetGroupId();
    }
  }
  // Toggle Hold
  async _onToggleHoldStatus(c: SwadeCombatant) {
    if (!c.roundHeld) {
      // Add flag for on hold to show icon on token
      await c.setRoundHeld(this.viewed!.round);
      if (c.isGroupLeader) {
        const followers = await this._getFollowers(c);
        for (const f of followers) {
          await f.setRoundHeld(this.viewed!.round);
        }
      }
    } else {
      await c.unsetFlag('swade', 'roundHeld');
    }
  }
  // Toggle Turn Lost
  async _onToggleTurnLostStatus(c: SwadeCombatant) {
    if (!c.turnLost) {
      const groupId = c.groupId;
      if (groupId) {
        const leader = await this.viewed!.combatants.find(
          (l) => l.id === groupId,
        );
        if (leader) {
          await c.setTurnLost(true);
        }
      } else {
        await c.update({
          flags: {
            swade: {
              turnLost: true,
              '-=roundHeld': null,
            },
          },
        });
      }
    } else {
      await c.update({
        flags: {
          swade: {
            roundHeld: this.viewed!.round,
            '-=turnLost': null,
          },
        },
      });
    }
  }
  // Act Now
  async _onActNow(combatant: SwadeCombatant) {
    let targetCombatant = this.viewed!.combatant;
    if (combatant.id === targetCombatant?.id) {
      targetCombatant = this.viewed!.turns.find((c) => !c.roundHeld)!;
    }
    await combatant.update({
      flags: {
        swade: {
          cardValue: targetCombatant?.cardValue,
          suitValue: targetCombatant?.suitValue! + 0.01,
          '-=roundHeld': null,
        },
      },
    });
    if (combatant.isGroupLeader) {
      const followers = await this._getFollowers(combatant);
      let s = combatant.suitValue!;
      for await (const f of followers) {
        s -= 0.001;
        await f.update({
          flags: {
            swade: {
              cardValue: combatant.cardValue,
              suitValue: s,
              '-=roundHeld': null,
            },
          },
        });
      }
    }

    await this.viewed?.update({
      turn: this.viewed.turns.findIndex((c) => c.id === combatant.id),
    });
  }
  // Act After Current Combatant
  async _onActAfterCurrentCombatant(combatant: SwadeCombatant) {
    const currentCombatant = this.viewed!.combatant;
    await combatant.update({
      flags: {
        swade: {
          cardValue: currentCombatant?.cardValue,
          suitValue: currentCombatant?.suitValue! - 0.01,
          '-=roundHeld': null,
        },
      },
    });
    if (combatant.isGroupLeader) {
      const followers = await this._getFollowers(combatant);
      let s = combatant.suitValue!;
      for await (const f of followers) {
        s -= 0.001;
        await f.update({
          flags: {
            swade: {
              cardValue: combatant.cardValue,
              suitValue: s,
              '-=roundHeld': null,
            },
          },
        });
      }
    }

    await this.viewed?.update({
      turn: this.viewed.turns.findIndex((c) => c.id === currentCombatant?.id),
    });
  }
  async _getFollowers(c: SwadeCombatant) {
    return game.combat?.combatants.filter((f) => f.groupId === c.id) ?? [];
  }
}
