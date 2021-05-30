export default class SwadeCombatTracker extends CombatTracker {
  /**
   * Extend and override the default options used by the Actor Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      classes: ['swade', 'swadeCombat', 'SwadeActor'],
    };
  }
  get template() {
    return 'systems/swade/templates/sidebar/combat-tracker.hbs';
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.combatant-control.hold').click(this._onHold.bind(this));
    html.find('.combatant-control.loseTurn').click(this._loseTurn.bind(this));
  }

  // Toggle Hold
  async _onHold(event: { currentTarget: any }) {
    // Get button
    const button = event.currentTarget;
    const combatantId = button.closest('.combatant').dataset.combatantId;
    //@ts-ignore
    const c = game.combat.combatants.get(combatantId);
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
          //@ts-ignore
          (c) => c.getFlag('swade', 'groupId') === targetCombatantId,
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
  async _loseTurn(event: { currentTarget: any }) {
    const button = event.currentTarget;
    const li = button.closest('.combatant');
    //@ts-ignore
    const c = game.combat.combatants.get(li.dataset.combatantId);

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
}
