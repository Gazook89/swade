import SwadeActor from './entities/SwadeActor';
import SwadeItem from './entities/SwadeItem';

interface RollHelperData {
  roll: Roll;
  bonusDamage?: Die;
  speaker?: any;
  flavor?: string;
  title?: string;
  item?: SwadeItem;
  actor?: SwadeActor;
  allowGroup?: boolean;
  flags?: object;
}

interface RollHandlerData {
  form: any;
  roll: Roll;
  speaker: any;
  flavor: string;
  raise?: boolean;
  actor?: SwadeActor;
  data?: object;
  allowGroup?: boolean;
  flags?: object;
}

/**
 * A helper class for dice interactions
 */
export default class SwadeDice {
  static async Roll({
    roll,
    speaker,
    flavor,
    title,
    item,
    actor,
    allowGroup,
    flags,
  }: RollHelperData): Promise<Roll> {
    const template = 'systems/swade/templates/chat/roll-dialog.html';
    const dialogData = {
      formula: roll.formula,
      rollMode: game.settings.get('core', 'rollMode'),
      rollModes: CONFIG.Dice.rollModes,
    };

    const buttons = {
      ok: {
        label: game.i18n.localize('SWADE.Roll'),
        icon: '<i class="fas fa-dice"></i>',
        callback: (html) => {
          finalRoll = this._handleRoll({
            form: html,
            roll: roll,
            speaker,
            flavor,
            flags,
          });
        },
      },
      extra: {
        label: '',
        icon: '<i class="far fa-plus-square"></i>',
        callback: (html) => {
          finalRoll = this._handleRoll({
            form: html,
            raise: true,
            actor: actor,
            roll: roll,
            allowGroup: actor && !actor.isWildcard && allowGroup,
            speaker,
            flavor,
            flags,
          });
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize('Cancel'),
      },
    };

    if (item) {
      buttons.extra.label = game.i18n.localize('SWADE.RollRaise');
    } else if (actor && !actor.isWildcard && allowGroup) {
      buttons.extra.label = game.i18n.localize('SWADE.GroupRoll');
    } else {
      delete buttons.extra;
    }

    const html = await renderTemplate(template, dialogData);
    //Create Dialog window
    let finalRoll: Roll = null;
    return new Promise((resolve) => {
      new Dialog({
        title: title,
        content: html,
        buttons: buttons,
        default: 'ok',
        close: () => {
          resolve(finalRoll);
        },
      }).render(true);
    });
  }

  static _handleRoll({
    form = null,
    raise = false,
    actor = null,
    roll = null,
    data = {},
    speaker = null,
    flavor = '',
    allowGroup = false,
    flags,
  }: RollHandlerData): Roll {
    let rollMode = game.settings.get('core', 'rollMode') as Const.DiceRollMode;
    const groupRoll = actor && raise;
    // Optionally include a situational bonus
    if (form) data['bonus'] = form.find('#bonus').val();
    if (data['bonus']) roll.terms.push(data['bonus']);
    if (groupRoll && allowGroup) {
      //Group roll
      const tempRoll = new Roll('');
      const wildRoll = new Roll('');

      tempRoll.terms.push(roll.terms[0]);
      const wildDie = new Die({
        number: 1,
        faces: 6,
        modifiers: ['x'],
        options: { flavor: game.i18n.localize('SWADE.WildDie') },
      });
      wildRoll.terms.push(wildDie);
      const pool = new DicePool({
        rolls: [tempRoll, wildRoll],
        modifiers: ['kh'],
      });
      roll.terms[0] = pool;
      flavor = `${flavor} ${game.i18n.localize('SWADE.GroupRoll')}`;
    } else if (raise) {
      roll.terms.push('+');
      roll.terms.push(new Die({ modifiers: ['x'] }));
    }
    const retVal = roll.evaluate();
    //This is a workaround to add the DSN Wild Die until the bug which resets the options object is resolved
    for (const v of roll.terms) {
      if (v instanceof Die) continue;
      if (v['rolls']) {
        v['rolls'].forEach((roll: Roll) => {
          roll.terms.forEach((term: Die | string | number) => {
            if (
              term instanceof Die &&
              !!game.dice3d &&
              term.options['flavor'] ===
                game.i18n.localize('SWADE.WildDie').replace(' ', '')
            ) {
              const colorPreset =
                game.user.getFlag('swade', 'dsnWildDie') || 'none';
              if (colorPreset !== 'none')
                term.options['colorset'] = colorPreset;
            }
          });
        });
      }
    }
    //End of Workaround
    // Convert the roll to a chat message and return the roll
    rollMode = form
      ? (form.find('#rollMode').val() as Const.DiceRollMode)
      : (rollMode as Const.DiceRollMode);
    retVal.toMessage(
      {
        speaker: speaker,
        flavor: flavor,
        flags: flags,
      },
      { rollMode },
    );
    return retVal;
  }
}
