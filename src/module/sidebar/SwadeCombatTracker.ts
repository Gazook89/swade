/**
 * This class defines a a new Combat Tracker specifically designed for SWADE
 */
import { SWADE } from '../config';
export default class SwadeCombatTracker extends CombatTracker {
  /** @inheritdoc */
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
    const cardTable = game.tables.getName(SWADE.init.cardTable);
    cardTable.reset();
    ui.notifications.info(
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
    const c = this.viewed.combatants.get(li.dataset.combatantId);
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
  async _onToggleDefeatedStatus(c) {
    await super._onToggleDefeatedStatus(c);
    if (c.getFlag('swade', 'isGroupLeader')) {
      //@ts-ignore
      const newLeader = await this.viewed.combatants.find(
        (f) => f.getFlag('swade', 'groupId') === c.id && !f.data.defeated,
      );
      //@ts-ignore
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
        //@ts-ignore
        await f.update({ 'flags.swade.groupId': newLeader.id });
      }
      await c.unsetFlag('swade', 'isGroupLeader');
    }
    if (c.getFlag('swade', 'groupId')) {
      await c.unsetFlag('swade', 'groupId');
    }
  }

  // Toggle Hold
  async _onToggleHoldStatus(c) {
    //@ts-ignore
    if (!c.getFlag('swade', 'roundHeld')) {
      // Add flag for on hold to show icon on token
      //@ts-ignore
      await c.setFlag('swade', 'roundHeld', this.viewed.round);
      if (
        //@ts-ignore
        c.getFlag('swade', 'isGroupLeader')
      ) {
        const followers = await this._getFollowers(c);
        for (const f of followers) {
          //@ts-ignore
          f.setFlag('swade', 'roundHeld', this.viewed.round);
        }
      }
    } else {
      //@ts-ignore
      await c.unsetFlag('swade', 'roundHeld');
    }
  }

  // Toggle Turn Lost
  async _onToggleTurnLostStatus(c) {
    if (!c.getFlag('swade', 'turnLost')) {
      const groupId = c.getFlag('swade', 'groupId');
      if (groupId) {
        //@ts-ignore
        const leader = await this.viewed.combatants.find(l => l.id === groupId);
        if (leader) {
          await c.setFlag('swade', 'turnLost', true);
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
  async _onActNow(c) {
    //@ts-ignore
    const currentCombatant = this.viewed.combatant;
    //@ts-ignore
    if (c.id === currentCombatant.id) {
      //@ts-ignore
      const nextactiveCombatant = this.viewed.turns.find(
        (c) =>
          //@ts-ignore
          !c.getFlag('swade', 'roundHeld'),
      );
      //@ts-ignore
      const nextActiveCardValue = nextactiveCombatant.getFlag(
        'swade',
        'cardValue',
      );
      //@ts-ignore
      const nextActiveSuitValue = nextactiveCombatant.getFlag(
        'swade',
        'suitValue',
      );
      if (c.getFlag('swade', 'isGroupLeader')) {
        const followers = await this._getFollowers(c);
        for await (const f of followers) {
          console.log(
            //@ts-ignore
            `${f.name} has '${f.getFlag('swade', 'cardValue')} and ${
              c.name
            } has ${c.getFlag('swade', 'cardValue')}`,
          );
          if (
            //@ts-ignore
            f.getFlag('swade', 'cardValue') === c.getFlag('swade', 'cardValue')
          ) {
            //@ts-ignore
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
      //@ts-ignore
      const currentCardValue = currentCombatant.getFlag('swade', 'cardValue');
      //@ts-ignore
      const currentSuitValue = currentCombatant.getFlag('swade', 'suitValue');
      if (c.getFlag('swade', 'isGroupLeader')) {
        const followers = await this._getFollowers(c);
        for await (const f of followers) {
          console.log(
            //@ts-ignore
            `${f.name} has '${f.getFlag('swade', 'cardValue')} and ${
              c.name
            } has ${c.getFlag('swade', 'cardValue')}`,
          );
          if (
            //@ts-ignore
            f.getFlag('swade', 'cardValue') === c.getFlag('swade', 'cardValue')
          ) {
            //@ts-ignore
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
  async _onActAfterCurrentCombatant(c) {
    //@ts-ignore
    const currentCombatant = this.viewed.combatant;
    //@ts-ignore
    const currentCardValue = currentCombatant.getFlag('swade', 'cardValue');
    //@ts-ignore
    const currentSuitValue = currentCombatant.getFlag('swade', 'suitValue');
    if (c.getFlag('swade', 'isGroupLeader')) {
      const followers = await this._getFollowers(c);
      for (const f of followers) {
        if (
          //@ts-ignore
          f.getFlag('swade', 'cardValue') === c.getFlag('swade', 'cardValue')
        ) {
          //@ts-ignore
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

  async _getFollowers(c) {
    return game.combat.combatants.filter(
      (f) =>
        //@ts-ignore
        f.getFlag('swade', 'groupId') === c.id,
    );
  }
}
