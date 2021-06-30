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
      const newLeader = await this.viewed.combatants.find(
        (f) => f.getFlag('swade', 'groupId') === c.id && !f.data.defeated,
      );

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
    if (!c.getFlag('swade', 'roundHeld')) {
      // Add flag for on hold to show icon on token

      await c.setFlag('swade', 'roundHeld', this.viewed.round);
      if (c.getFlag('swade', 'isGroupLeader')) {
        const followers = await this._getFollowers(c);
        for (const f of followers) {
          f.setFlag('swade', 'roundHeld', this.viewed.round);
        }
      }
    } else {
      await c.unsetFlag('swade', 'roundHeld');
    }
  }

  // Toggle Turn Lost
  async _onToggleTurnLostStatus(c) {
    if (!c.getFlag('swade', 'turnLost')) {
      const groupId = c.getFlag('swade', 'groupId');
      if (groupId) {
        const leader = await this.viewed.combatants.find(
          (l) => l.id === groupId,
        );
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
            roundHeld: this.viewed.round,
            '-=turnLost': null,
          },
        },
      });
    }
  }

  // Act Now
  async _onActNow(c) {
    const currentCombatant = this.viewed.combatant;

    if (c.id === currentCombatant.id) {
      const nextactiveCombatant = this.viewed.turns.find(
        (c) => !c.getFlag('swade', 'roundHeld'),
      );

      const nextActiveCardValue = nextactiveCombatant.getFlag(
        'swade',
        'cardValue',
      );

      const nextActiveSuitValue = nextactiveCombatant.getFlag(
        'swade',
        'suitValue',
      );
      if (c.getFlag('swade', 'isGroupLeader')) {
        const followers = await this._getFollowers(c);
        for await (const f of followers) {
          console.log(
            `${f.name} has '${f.getFlag('swade', 'cardValue')} and ${
              c.name
            } has ${c.getFlag('swade', 'cardValue')}`,
          );
          if (
            f.getFlag('swade', 'cardValue') === c.getFlag('swade', 'cardValue')
          ) {
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
      const currentCardValue = currentCombatant.getFlag('swade', 'cardValue');

      const currentSuitValue = currentCombatant.getFlag('swade', 'suitValue');
      if (c.getFlag('swade', 'isGroupLeader')) {
        const followers = await this._getFollowers(c);
        for await (const f of followers) {
          console.log(
            `${f.name} has '${f.getFlag('swade', 'cardValue')} and ${
              c.name
            } has ${c.getFlag('swade', 'cardValue')}`,
          );
          if (
            f.getFlag('swade', 'cardValue') === c.getFlag('swade', 'cardValue')
          ) {
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

    await this.viewed.update({
      turn: await this.viewed.turns.indexOf(c),
    });
  }

  // Act After Current Combatant
  async _onActAfterCurrentCombatant(c) {
    const currentCombatant = this.viewed.combatant;

    const currentCardValue = currentCombatant.getFlag('swade', 'cardValue');

    const currentSuitValue = currentCombatant.getFlag('swade', 'suitValue');
    if (c.getFlag('swade', 'isGroupLeader')) {
      const followers = await this._getFollowers(c);
      for (const f of followers) {
        if (
          f.getFlag('swade', 'cardValue') === c.getFlag('swade', 'cardValue')
        ) {
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

    this.viewed.update({
      turn: await this.viewed.turns.indexOf(currentCombatant),
    });
  }

  async _getFollowers(c) {
    return game.combat.combatants.filter(
      (f) => f.getFlag('swade', 'groupId') === c.id,
    );
  }
}
