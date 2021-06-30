/**
 * This class defines a form colorpicker for group leader to assign a group color
 */
export default class SwadeCombatGroupColor extends FormApplication {
  config: any;
  groupDefaultColors: any;
  constructor(object = {}, options = {}) {
    super(object, options);
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.reset-color').click(this._onResetColor.bind(this));
  }
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: 'group-color-picker',
      title: 'SWADE.SetGroupColor',
      template:
        'systems/swade/templates/sidebar/combatant-group-color-picker.hbs',
      classes: ['swade'],
      width: 275,
      height: 'auto' as const,
      resizable: false,
      closeOnSubmit: true,
      submitOnClose: true,
      submitOnChange: false,
    };
  }

  async _onChangeColorPicker(event) {
    super._onChangeColorPicker(event);

    this.object.setFlag('swade', 'groupColor', event.currentTarget.value);
  }

  async _onResetColor(event) {
    const c = game.combat.combatants.get(this.object.id);
    let groupColor = '#efefef';

    if (c?.players?.length) {
      groupColor = c.players[0].data.color;
    } else {
      const gm = game.users.find((u) => u.isGM === true);

      groupColor = gm.data.color;
    }

    this.object.unsetFlag('swade', 'groupColor');
    this.form['groupColor'].value = groupColor;
  }

  async _updateObject(event, formData) {}
}
