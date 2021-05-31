import { SysActorData } from '../../interfaces/actor-data';
import { SysItemData } from '../../interfaces/item-data';
import SwadeActor from '../entities/SwadeActor';
import SwadeItem from '../entities/SwadeItem';

export default class SwadeEntityTweaks extends FormApplication {
  constructor(object, options = {}) {
    super(object, options);
  }
  object: SwadeActor | SwadeItem;
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = 'sheet-tweaks';
    options.width = 380;
    return options;
  }

  /* -------------------------------------------- */

  /**
   * Add the Entity name into the window title
   * @type {String}
   */
  get title() {
    return `${this.object.name}: SWADE Tweaks`;
  }

  /**
   * @override
   */
  get template() {
    return 'systems/swade/templates/actors/dialogs/tweaks-dialog.html';
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {Object}
   */
  getData(): any {
    const data = this.object.data;
    const settingFields = this._getAppropriateSettingFields();

    for (const key of Object.keys(settingFields)) {
      const fieldExists = getProperty(
        this.object.data,
        `data.additionalStats.${key}`,
      );
      if (fieldExists) {
        settingFields[key]['useField'] = true;
      }
    }
    data['autoCalc'] = {
      toughness: getProperty(
        this.object,
        'data.data.details.autoCalcToughness',
      ),
      armor: getProperty(this.object, 'data.data.details.autoCalcArmor'),
    };
    data['settingFields'] = settingFields;
    data['isActor'] = this._isActor();
    data['isCharacter'] = this.object.data.type === 'character';
    data['isNPC'] = this.object.data.type === 'npc';
    data['isVehicle'] = this.object.data.type === 'vehicle';
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
  }

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  async _updateObject(event, formData) {
    event.preventDefault();
    const expandedFormData = expandObject(formData) as
      | DeepPartial<SysItemData>
      | DeepPartial<SysActorData>;

    //recombine the formdata
    setProperty(
      expandedFormData,
      'data.additionalStats',
      this._handleAdditionalStats(expandedFormData),
    );

    // Update the actor
    //@ts-expect-error This can update both Item and Actor Documents but I'm not sure how to make TS understand
    await this.object.update(expandedFormData);
    this.object.sheet.render(true);
  }

  private _getAppropriateSettingFields() {
    const fields = game.settings.get('swade', 'settingFields') as any;
    let settingFields = {};
    if (this.object instanceof SwadeActor) {
      settingFields = fields.actor;
    } else if (this.object instanceof SwadeItem) {
      settingFields = fields.item;
    }
    return settingFields;
  }

  private _handleAdditionalStats(expandedFormData) {
    const formFields =
      getProperty(expandedFormData, 'data.additionalStats') || {};
    const prototypeFields = this._getAppropriateSettingFields();
    const newFields = deepClone(
      getProperty(this.object.data, 'data.additionalStats'),
    );
    //handle setting specific fields
    for (const [key, value] of Object.entries(formFields)) {
      const fieldExistsOnEntity = getProperty(
        this.object.data,
        `data.additionalStats.${key}`,
      );
      if (value['useField'] && !!fieldExistsOnEntity) {
        //update exisiting field;
        newFields[key]['hasMaxValue'] = prototypeFields[key]['hasMaxValue'];
        newFields[key]['dtype'] = prototypeFields[key]['dtype'];
        if (newFields[key]['dtype'] === 'Boolean') {
          newFields[key]['-=max'] = null;
        }
      } else if (value['useField'] && !fieldExistsOnEntity) {
        //add new field
        newFields[key] = prototypeFields[key];
      } else {
        //delete field
        newFields[`-=${key}`] = null;
      }
    }

    //handle "stray" fields that exist on the actor but have no prototype
    for (const key of Object.keys(
      getProperty(this.object.data, 'data.additionalStats'),
    )) {
      if (!prototypeFields[key]) {
        newFields[`-=${key}`] = null;
      }
    }
    return newFields;
  }

  private _isActor() {
    return (
      this.object.data.type === 'character' ||
      this.object.data.type === 'npc' ||
      this.object.data.type === 'vehicle'
    );
  }
}
