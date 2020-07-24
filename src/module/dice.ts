import SwadeItem from './entities/SwadeItem';
import SwadeActor from './entities/SwadeActor';

export class SwadeDice {
  // eslint-disable-next-line no-unused-vars
  static async Roll({
    parts = [],
    data = {},
    event = null,
    speaker = null,
    flavor = null,
    title = null,
    item = null as SwadeItem,
    actor = null as SwadeActor,
  } = {}) {
    let rollMode = game.settings.get('core', 'rollMode');
    let rolled = false;
    let filtered = parts.filter(function (el) {
      return el != '' && el;
    });

    const template = 'systems/swade/templates/chat/roll-dialog.html';
    let dialogData = {
      formula: filtered.join(' '),
      data: data,
      rollMode: rollMode,
      rollModes: CONFIG.Dice.rollModes,
    };

    let buttons = {
      ok: {
        label: game.i18n.localize('SWADE.Roll'),
        icon: '<i class="fas fa-dice"></i>',
        callback: (html) => {
          roll = this._handleRoll({
            form: html[0].children[0],
            rollParts: filtered,
            speaker,
            flavor,
          });
          rolled = true;
        },
      },
      extra: {
        label: '',
        icon: '<i class="far fa-plus-square"></i>',
        callback: (html) => {
          roll = this._handleRoll({
            form: html[0].children[0],
            raise: true,
            rollParts: filtered,
            speaker,
            flavor,
          });
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize('SWADE.Cancel'),
      },
    };

    if (item) {
      buttons.extra.label = game.i18n.localize('SWADE.RollRaise');
    } else if (actor && !actor.isWildcard) {
      buttons.extra.label = game.i18n.localize('SWADE.GroupRoll');
    } else {
      delete buttons.extra;
    }

    const html = await renderTemplate(template, dialogData);
    //Create Dialog window
    let roll: Roll;
    return new Promise((resolve) => {
      new Dialog({
        title: title,
        content: html,
        buttons: buttons,
        default: 'ok',
        close: () => {
          resolve(rolled ? roll : false);
        },
      }).render(true);
    });
  }

  static _handleRoll({
    form = null,
    raise = false,
    rollParts = [],
    data = {},
    speaker = null,
    flavor = '',
  }): Roll {
    let rollMode = game.settings.get('core', 'rollMode');
    // Optionally include a situational bonus
    if (form !== null) data['bonus'] = form.bonus.value;
    if (data['bonus']) rollParts.push(data['bonus']);
    if (raise) rollParts.push('+1d6x=');

    const roll = new Roll(rollParts.join(''), data).roll();
    // Convert the roll to a chat message and return the roll
    rollMode = form ? form.rollMode.value : rollMode;
    roll.toMessage(
      {
        speaker: speaker,
        flavor: flavor,
      },
      { rollMode },
    );
    return roll;
  }
}
