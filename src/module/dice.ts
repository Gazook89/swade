//@ts-nocheck
import SwadeActor from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';
interface RollHelperData {
  roll: Roll;
  bonusDamage?: Die;
  speaker?: foundry.data.ChatMessageData['speaker']['_source'];
  flavor?: string;
  title?: string;
  item?: SwadeItem;
  actor?: SwadeActor;
  allowGroup?: boolean;
  flags?: object;
}

interface RollHandlerData {
  form: any;
  roll: Roll | null;
  speaker: foundry.data.ChatMessageData['speaker']['_source'];
  flavor: string;
  raise?: boolean;
  actor?: SwadeActor;
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
  }: RollHelperData): Promise<Roll | null> {
    return new Promise((resolve) => {
      const template = 'systems/swade/templates/chat/roll-dialog.html';
      const dialogData = {
        formula: roll.formula,
        rollMode: game.settings.get('core', 'rollMode'),
        rollModes: CONFIG.Dice.rollModes,
      };
      let confirmed = false;
      const buttons = {
        ok: {
          label: game.i18n.localize('SWADE.Roll'),
          icon: '<i class="fas fa-dice"></i>',
          callback: async (html) => {
            confirmed = true;
            finalRoll = await this._handleRoll({
              form: html,
              roll: roll,
              speaker,
              flavor,
              flags,
            });
            resolve(finalRoll);
          },
        },
        extra: {
          label: '',
          icon: '<i class="far fa-plus-square"></i>',
          callback: async (html) => {
            confirmed = true;
            finalRoll = await this._handleRoll({
              form: html,
              raise: true,
              actor: actor,
              roll: roll,
              allowGroup: actor && !actor.isWildcard && allowGroup,
              speaker,
              flavor,
              flags,
            });
            resolve(finalRoll);
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
      let finalRoll = null;
      new Dialog({
        title: title,
        content: html,
        buttons: buttons,
        default: 'ok',
        close: () => {
          if (!confirmed) {
            resolve(null);
          }
        },
      }).render(true);
    });
  }

  static _handleRoll({
    form = null,
    raise = false,
    actor = null,
    roll = null,
    speaker = null,
    flavor = '',
    allowGroup = false,
    flags,
  }: RollHandlerData): Roll {
    const terms = roll.terms;
    const groupRoll = actor && raise;
    //get the rollMode
    const rollMode = form
      ? (form.find('#rollMode').val() as foundry.CONST.DiceRollMode)
      : (game.settings.get('core', 'rollMode') as foundry.CONST.DiceRollMode);
    // Optionally include a situational bonus
    let bonus: string = '';
    if (form) bonus = form.find('#bonus').val();
    if (bonus) {
      if (!bonus[0].match(/[+-]/)) bonus = '+' + bonus;
      terms.push(...Roll.parse(bonus, {}));
      flavor = `${flavor}<br>${game.i18n.localize('SWADE.SitMod')}: ${bonus}`;
    }

    //Group roll and raises
    if (groupRoll && allowGroup) {
      const traitPool = terms[0];
      if (traitPool instanceof PoolTerm) {
        const wildDie = new Die({
          faces: 6,
          modifiers: ['x'],
          options: { flavor: game.i18n.localize('SWADE.WildDie') },
        });
        const wildRoll = Roll.fromTerms([wildDie]);
        traitPool.rolls.push(wildRoll);
        traitPool.terms.push(wildRoll.formula);
        flavor = `${flavor}<br>${game.i18n.localize('SWADE.GroupRoll')}`;
      }
    } else if (raise) {
      terms.push(new OperatorTerm({ operator: '+' }));
      terms.push(
        new Die({
          faces: 6,
          modifiers: ['x'],
          options: { flavor: game.i18n.localize('SWADE.BonusDamage') },
        }),
      );
    }
    //recreate the roll
    //This is a workaround to add the DSN Wild Die until the bug which resets the options object is resolved
    for (const term of terms) {
      if (term instanceof PoolTerm) {
        for (const roll of term.rolls) {
          for (const term of roll.terms) {
            if (
              term instanceof Die &&
              game.dice3d &&
              term.flavor === game.i18n.localize('SWADE.WildDie')
            ) {
              const colorPreset =
                game.user.getFlag('swade', 'dsnWildDie') || 'none';
              if (colorPreset !== 'none') {
                term.options['colorset'] = colorPreset;
              }
            }
          }
        }
      }
    }
    //End of Workaround
    // Convert the roll to a chat message and return the roll
    const newRoll = Roll.fromTerms(terms, roll.options);
    newRoll.evaluate({ async: false });
    newRoll.toMessage(
      {
        speaker: speaker,
        flavor: flavor,
        flags: flags,
      },
      { rollMode },
    );
    return newRoll;
  }
}
