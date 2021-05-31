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
    const tracker = html.find('#combat-tracker');
    const combatants = tracker.find('.combatant');
    html.find('.combatant-control').click(this._onCombatantControl.bind(this));
  }

  async _onCombatantControl(event) {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    const li = btn.closest('.combatant');
    //@ts-ignore
    const c = game.combat.combatants.get(li.dataset.combatantId);

    // Switch control action
    switch (btn.dataset.control) {
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

  // Toggle Hold
  async _onToggleHoldStatus(c) {
    //@ts-ignore
    if (!c.getFlag('swade', 'roundHeld')) {
      // Add flag for on hold to show icon on token
      //@ts-ignore
      await c.setFlag('swade', 'roundHeld', game.combat.round);
      if (
        //@ts-ignore
        c.getFlag('swade', 'isGroupLeader')
      ) {
        const followers = game.combat.combatants.filter(
          (f) =>
            //@ts-ignore
            f.getFlag('swade', 'groupId') === c.id,
        );
        for (const f of followers) {
          //@ts-ignore
          f.setFlag('swade', 'roundHeld', game.combat.round);
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
      await c.update({
        flags: {
          swade: {
            turnLost: true,
            '-=roundHeld': null,
          },
        },
      });
    } else {
      await c.update({
        flags: {
          swade: {
            roundHeld: game.combat.round,
            '-=turnLost': null,
          },
        },
      });
    }
  }
  // Act Now
  async _onActNow(c) {
    const cId = c.id;
    const currentCombatant = game.combat.combatant;
    const nextActiveCombatant = game.combat.turns.find(
      (c) =>
        //@ts-ignore
        !c.getFlag('swade', 'roundHeld'),
    );
    //@ts-ignore
    if (c.id !== currentCombatant.id) {
      //@ts-ignore
      const currentCardValue = currentCombatant.getFlag('swade', 'cardValue');
      //@ts-ignore
      const currentSuitValue = currentCombatant.getFlag('swade', 'suitValue');
      await c.update({
        flags: {
          swade: {
            cardValue: currentCardValue,
            suitValue: currentSuitValue + 0.9,
          },
        },
      });
      if (c.getFlag('swade', 'isGroupLeader')) {
        const followers = game.combat.combatants.filter(
          (c) =>
            //@ts-ignore
            c.getFlag('swade', 'groupId') === cId,
        );
        for (const f of followers) {
          //@ts-ignore
          await f.update({
            flags: {
              swade: {
                cardValue: currentCardValue,
                suitValue: c.getFlag('swade', 'suitValue') - 0.01,
                '-=roundHeld': null,
              },
            },
          });
          await game.combat.previousTurn();
        }
      }
      await game.combat.previousTurn();
    } else {
      const nextActiveCombatant = game.combat.turns.find(
        (c) =>
          //@ts-ignore
          !c.getFlag('swade', 'roundHeld'),
      );
      //@ts-ignore
      const nextActiveCardValue = nextActiveCombatant.getFlag(
        'swade',
        'cardValue',
      );
      //@ts-ignore
      const nextActiveSuitValue = nextActiveCombatant.getFlag(
        'swade',
        'suitValue',
      );
      await c.update({
        flags: {
          swade: {
            cardValue: nextActiveCardValue,
            suitValue: nextActiveSuitValue + 0.9,
          },
        },
      });
      if (c.getFlag('swade', 'isGroupLeader')) {
        const followers = game.combat.combatants.filter(
          (c) =>
            //@ts-ignore
            c.getFlag('swade', 'groupId') === cId,
        );
        for (const f of followers) {
          //@ts-ignore
          await f.update({
            flags: {
              swade: {
                cardValue: nextActiveCardValue,
                suitValue: c.getFlag('swade', 'suitValue') - 0.01,
                '-=roundHeld': null,
              },
            },
          });
          game.combat.previousTurn();
        }
      }
    }
    await c.unsetFlag('swade', 'roundHeld');
    //@ts-ignore
    if (
      cId !== currentCombatant.id &&
      currentCombatant.id != nextActiveCombatant.id
    ) {
      await game.combat.previousTurn();
    }
  }
  // Act After Current Combatant
  async _onActAfterCurrentCombatant(c) {
    const cId = c.id;
    const currentCombatant = game.combat.combatant;
    //@ts-ignore
    const currentCardValue = currentCombatant.getFlag('swade', 'cardValue');
    //@ts-ignore
    const currentSuitValue = currentCombatant.getFlag('swade', 'suitValue');
    await c.update({
      flags: {
        swade: {
          cardValue: currentCardValue,
          suitValue: currentSuitValue - 0.1,
        },
      },
    });
    await c.unsetFlag('swade', 'roundHeld');
    if (c.getFlag('swade', 'isGroupLeader')) {
      const followers = game.combat.combatants.filter(
        (c) =>
          //@ts-ignore
          c.getFlag('swade', 'groupId') === cId,
      );
      for (const f of followers) {
        //@ts-ignore
        await f.update({
          flags: {
            swade: {
              cardValue: currentCardValue,
              suitValue: c.getFlag('swade', 'suitValue') - 0.01,
              '-=roundHeld': null,
            },
          },
        });
        // Go back to previous turn because technically it's still their turn and the holder is going after them.
        await game.combat.previousTurn();
      }
    }
    // Go back to previous turn because technically it's still their turn and the holder is going after them.
    await game.combat.previousTurn();
  }
}
