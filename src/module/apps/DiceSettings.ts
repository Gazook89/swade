import { SWADE } from '../config';

/**
 * This class defines a submenu for the system settings which will handle the DSN Settings
 */
export default class DiceSettings extends FormApplication {
  config: any;
  customWildDieDefaultColors: any;
  constructor(object = {}, options = {}) {
    super(object, options);
    this.config = SWADE.diceConfig;
    this.customWildDieDefaultColors =
      this.config.flags.dsnCustomWildDieColors.default;
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: SWADE.diceConfig.id,
      title: SWADE.diceConfig.title,
      template: 'systems/swade/templates/apps/dice-config.hbs',
      classes: ['swade', 'dice-config', 'dice-so-nice'],
      width: 500,
      height: 'auto' as const,
      resizable: false,
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
    };
  }

  /**
   * @override
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    html.find('#reset').on('click', () => this._resetSettings());
    html
      .find('#submit')
      .on('click', () => this.close().then(() => location.reload()));
  }

  /**
   * @override
   */
  getData(): any {
    const settings = {};
    for (const flag in this.config.flags) {
      const defaultValue = this.config.flags[flag].default;
      const value = game.user?.getFlag('swade', flag);
      settings[flag] = {
        module: 'swade',
        key: flag,
        value: typeof value === 'undefined' ? defaultValue : value,
        name: this.config.flags[flag].label || '',
        hint: this.config.flags[flag].hint || '',
        type: this.config.flags[flag].type,
        isCheckbox: this.config.flags[flag].type === Boolean,
        isObject: this.config.flags[flag].type === Object,
      };
      if (flag === 'dsnWildDie') {
        settings[flag].isSelectOptGroup = true;
        settings[flag].groups = this._prepareColorsetList();
      }
    }

    return {
      settings,
      hasCustomWildDie: settings['dsnWildDie'].value !== 'customWildDie',
      textureList: this._prepareTextureList(),
      fontList: this._prepareFontList(),
      materialList: this._prepareMaterialList(),
    };
  }

  async _updateObject(event, formData): Promise<void> {
    const expandedFormdata = expandObject(formData) as any;
    //handle basic settings
    for (const [key, value] of Object.entries(expandedFormdata.swade)) {
      //handle custom wild die
      if (expandedFormdata.swade.dsnWildDie === 'customWildDie') {
        await game.user?.setFlag('swade', 'dsnCustomWildDieColors', {
          diceColor:
            expandedFormdata.diceColor ||
            this.customWildDieDefaultColors.diceColor,
          edgeColor:
            expandedFormdata.edgeColor ||
            this.customWildDieDefaultColors.edgeColor,
          labelColor:
            expandedFormdata.labelColor ||
            this.customWildDieDefaultColors.labelColor,
          outlineColor:
            expandedFormdata.outlineColor ||
            this.customWildDieDefaultColors.outlineColor,
        });
      }
      await game.user?.setFlag('swade', key, value);
    }
    this.render(true);
  }

  async _resetSettings() {
    for (const flag in this.config.flags) {
      const resetValue = this.config.flags[flag].default;
      if (game.user?.getFlag('swade', flag) !== resetValue) {
        await game.user?.setFlag('swade', flag, resetValue);
      }
    }
    this.render(true);
  }

  private _prepareColorsetList() {
    const sets = this._deepCopyColorsets(SWADE.dsnColorSets);
    sets.none = {
      name: 'none',
      category: 'DICESONICE.Colors',
      description: 'SWADE.DSNNone',
    };
    delete sets.custom;
    const groupedSetsList = Object.values(sets) as any[];
    groupedSetsList.sort((set1: any, set2: any) => {
      if (
        game.i18n.localize(set1.description) <
        game.i18n.localize(set2.description)
      ) {
        return -1;
      } else if (
        game.i18n.localize(set1.description) >
        game.i18n.localize(set2.description)
      ) {
        return 1;
      } else {
        return 0;
      }
    });
    const preparedList = {};
    for (let i = 0; i < groupedSetsList.length; i++) {
      const locCategory = game.i18n.localize(groupedSetsList[i].category);
      if (!preparedList.hasOwnProperty(locCategory))
        preparedList[locCategory] = {};

      preparedList[locCategory][groupedSetsList[i].name] = game.i18n.localize(
        groupedSetsList[i].description,
      );
    }
    return preparedList;
  }

  private _prepareTextureList() {
    return Object.keys(SWADE.dsnTextureList).reduce((i18nCfg, key) => {
      i18nCfg[key] = SWADE.dsnTextureList[key].name;
      return i18nCfg;
    }, {});
  }

  private _prepareFontList() {
    const fontList = {
      auto: game.i18n.localize('DICESONICE.FontAuto'),
    };
    game.dice3d?.box.dicefactory.fontFamilies.forEach((font) => {
      fontList[font] = font;
    });
    fontList['auto'] = game.i18n.localize('DICESONICE.FontAuto');
    return fontList;
  }

  private _prepareMaterialList() {
    return {
      auto: 'DICESONICE.MaterialAuto',
      plastic: 'DICESONICE.MaterialPlastic',
      metal: 'DICESONICE.MaterialMetal',
      glass: 'DICESONICE.MaterialGlass',
      wood: 'DICESONICE.MaterialWood',
      chrome: 'DICESONICE.MaterialChrome',
    };
  }

  private _deepCopyColorsets(colorsets: any): any {
    const deepCopy = {};
    for (const [key, value] of Object.entries(colorsets) as [string, any]) {
      deepCopy[deepClone(key)] = {
        name: deepClone(value['name']),
        category: deepClone(value['category']),
        description: deepClone(value['description']),
      };
    }
    return deepCopy;
  }
}
