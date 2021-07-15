import { SWADE } from '../config';
import SwadeCombatant from '../documents/SwadeCombatant';

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
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.combatant-control').click(this._onCombatantControl.bind(this));
    html
      .find('.combat-control[data-control=resetDeck]')
      .click(this._onResetActionDeck.bind(this));
  }
  // Reset the Action Deck
  async _onResetActionDeck(event) {
    event.stopImmediatePropagation();
    const cardTable = game.tables?.getName(SWADE.init.cardTable)!;
    //@ts-ignore
    cardTable.reset();
    ui.notifications?.info(
      game.i18n.localize('SWADE.ActionDeckResetNotification'),
    );
  }
  async _onCombatantControl(event) {
    super._onCombatantControl(event);
    event.preventDefault();
    event.stopImmediatePropagation();
    const btn = event.currentTarget;
    const li = btn.closest('.combatant');
    //@ts-ignore
    const c = this.viewed.combatants.get(li.dataset.combatantId)!;
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
    }
  }
  // Toggle Defeated and reallocate followers
  async _onToggleDefeatedStatus(c: SwadeCombatant) {
    await super._onToggleDefeatedStatus(c);
    if (c.isGroupLeader) {
      //@ts-ignore
      const newLeader = await this.viewed.combatants.find(
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
      //@ts-ignore
      await c.setRoundHeld(this.viewed.round);
      if (c.isGroupLeader) {
        const followers = await this._getFollowers(c);
        for (const f of followers) {
          //@ts-ignore
          await f.setRoundHeld(this.viewed.round);
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
        //@ts-ignore
        const leader = await this.viewed.combatants.find(
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
            //@ts-ignore
            roundHeld: this.viewed.round,
            '-=turnLost': null,
          },
        },
      });
    }
  }
  // Act Now
  async _onActNow(c: SwadeCombatant) {
    //@ts-ignore
    const currentCombatant = this.viewed.combatant;
    if (c.id === currentCombatant.id) {
      //@ts-ignore
      const nextactiveCombatant = this.viewed.turns.find((c) => !c.roundHeld)!;
      const nextActiveCardValue = nextactiveCombatant.cardValue;
      const nextActiveSuitValue = nextactiveCombatant.suitValue!;
      if (c.isGroupLeader) {
        const followers = await this._getFollowers(c);
        for await (const f of followers) {
          if (f.cardValue === c.cardValue) {
            await f.update({
              flags: {
                swade: {
                  cardValue: nextActiveCardValue,
                  suitValue: nextActiveSuitValue + 0.8,
                  '-=roundHeld': null,
                },
              },
            });
          }
        }
      }
      await c.update({
        flags: {
          swade: {
            cardValue: nextActiveCardValue,
            suitValue: nextActiveSuitValue + 0.9,
            '-=roundHeld': null,
          },
        },
      });
    } else {
      const currentCardValue = currentCombatant.cardValue;
      const currentSuitValue = currentCombatant.suitValue!;
      if (c.isGroupLeader) {
        const followers = await this._getFollowers(c);
        for await (const f of followers) {
          if (f.cardValue === c.cardValue) {
            await f.update({
              flags: {
                swade: {
                  cardValue: currentCardValue,
                  suitValue: currentSuitValue + 0.8,
                  '-=roundHeld': null,
                },
              },
            });
          }
        }
      }
      await c.update({
        flags: {
          swade: {
            cardValue: currentCardValue,
            suitValue: currentSuitValue + 0.9,
            '-=roundHeld': null,
          },
        },
      });
    }
    //@ts-ignore
    await this.viewed.update({
      //@ts-ignore
      turn: await this.viewed.turns.indexOf(c),
    });
  }
  // Act After Current Combatant
  async _onActAfterCurrentCombatant(c: SwadeCombatant) {
    //@ts-ignore
    const currentCombatant = this.viewed.combatant;
    const currentCardValue = currentCombatant.cardValue;
    const currentSuitValue = currentCombatant.suitValue!;
    if (c.isGroupLeader) {
      const followers = await this._getFollowers(c);
      for (const f of followers) {
        if (f.cardValue === c.cardValue) {
          await f.update({
            flags: {
              swade: {
                cardValue: currentCardValue,
                suitValue: currentSuitValue - 0.2,
                '-=roundHeld': null,
              },
            },
          });
        }
      }
    }
    await c.update({
      flags: {
        swade: {
          cardValue: currentCardValue,
          suitValue: currentSuitValue - 0.1,
          '-=roundHeld': null,
        },
      },
    });
    //@ts-ignore
    this.viewed.update({
      //@ts-ignore
      turn: await this.viewed.turns.indexOf(currentCombatant),
    });
  }
  async _getFollowers(c: SwadeCombatant) {
    return game.combat?.combatants.filter((f) => f.groupId === c.id) ?? [];
  }
}
