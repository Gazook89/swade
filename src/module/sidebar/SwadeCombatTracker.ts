export default class SwadeCombatTracker extends CombatTracker {
  /**
   * Extend and override the default options used by the Actor Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      classes: ['swade'],
    };
  }
  get template() {
    return 'systems/swade/templates/sidebar/combat-tracker.html';
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.combatant-control.hold').click(this._onHold.bind(this));
    html.find('.combatant-control.lostTurn').click(this._loseTurn.bind(this));
  }
  async _onHold(event: { currentTarget: any }) {
    const button = event.currentTarget;
    const li = button.closest('.combatant');
    //@ts-ignore
    //const c = game.combat.combatants.get(li.dataset.combatantId);
    const c = game.combat.turns.find((t) => t.id === li.dataset.combatantId);
    console.log(c.data);
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
  async _loseTurn(event: { currentTarget: any }) {
    const button = event.currentTarget;
    const li = button.closest('.combatant');
    //@ts-ignore
    const c = this.combat.combatants.get(li.dataset.combatantId);
  }
}
