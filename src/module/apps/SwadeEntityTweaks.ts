import { AdditionalStat } from '../../interfaces/additional';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';

export default class SwadeEntityTweaks extends FormApplication<
  FormApplicationOptions,
  Record<string, unknown>,
  SwadeActor | SwadeItem
> {
  constructor(object, options = {}) {
    super(object, options);
  }
  object: SwadeActor | SwadeItem;
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'sheet-tweaks',
      width: 380,
    });
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
    return 'systems/swade/templates/actors/apps/tweaks-dialog.hbs';
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
    data['isCharacter'] = this.object.type === 'character';
    data['isNPC'] = this.object.type === 'npc';
    data['isVehicle'] = this.object.type === 'vehicle';
    data['advanceTypes'] = this._getAdvanceTypes();
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
    const expandedFormData = expandObject(formData);

    //recombine the formdata
    setProperty(
      expandedFormData,
      'data.additionalStats',
      this._handleAdditionalStats(expandedFormData),
    );

    // Update the actor
    await this.object.update(expandedFormData);
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
    const newFields = foundry.utils.deepClone(
      this.object.data.data.additionalStats,
    );
    //handle setting specific fields
    const entries = Object.entries(formFields) as [string, AdditionalStat][];
    for (const [key, value] of entries) {
      const fieldExistsOnEntity = !!this.object.data.data.additionalStats[key];
      if (value?.useField && fieldExistsOnEntity) {
        //update exisiting field;
        newFields![key].hasMaxValue = prototypeFields[key].hasMaxValue;
        newFields![key].dtype = prototypeFields[key]?.dtype;
        if (newFields[key]?.dtype === 'Boolean') {
          newFields[key]['-=max'] = null;
        }
      } else if (value.useField && !fieldExistsOnEntity) {
        //add new field
        newFields[key] = prototypeFields[key];
      } else {
        //delete field
        //@ts-expect-error This is only done to delete the key
        newFields[`-=${key}`] = null;
      }
    }

    //handle "stray" fields that exist on the actor but have no prototype
    for (const key of Object.keys(this.object.data.data.additionalStats)) {
      if (!prototypeFields[key]) {
        //@ts-expect-error This is only done to delete the key
        newFields[`-=${key}`] = null;
      }
    }
    return newFields;
  }

  private _isActor() {
    return this.object instanceof SwadeActor;
  }

  /** @override */
  protected _getSubmitData(updateData = {}) {
    const data = super._getSubmitData(updateData);
    // Prevent submitting overridden values
    const overrides = foundry.utils.flattenObject(this.object.overrides);
    for (const k of Object.keys(overrides)) {
      delete data[k];
    }
    return data;
  }

  private _getAdvanceTypes(): Record<string, string> {
    return {
      legacy: 'SWADE.Advances.Modes.Legacy',
      expanded: 'SWADE.Advances.Modes.Expanded',
    };
  }
}
