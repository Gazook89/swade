/**
 * This class defines a form colorpicker for group leader to assign a group color
 */
export default class SwadeCombatGroupColor extends FormApplication {
  config: any;
  groupDefaultColors: any;
  constructor(object = {}, options = {}) {
    super(object, options);
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
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
    };
  }

  async _onChangeColorPicker(event) {
      super._onChangeColorPicker(event);
      //@ts-ignore
      this.object.setFlag('swade', 'groupColor', event.currentTarget.value);
  }

  async _updateObject(event, formData) {
  }
}