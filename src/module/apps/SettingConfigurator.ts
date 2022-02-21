import { SWADE } from '../config';

export default class SettingConfigurator extends FormApplication<
  FormApplicationOptions,
  any,
  undefined
> {
  config: typeof SWADE.settingConfig;
  settingStats: any;
  constructor(object, options) {
    super(object, options);
    this.config = SWADE.settingConfig;
  }

  static get defaultOptions(): FormApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: SWADE.settingConfig.id,
      title: SWADE.settingConfig.title,
      template: 'systems/swade/templates/apps/setting-config.hbs',
      classes: ['setting-config', 'sheet'],
      tabs: [
        {
          navSelector: '.tabs',
          contentSelector: '.sheet-body',
          initial: 'basics',
        },
      ],
      scrollY: ['.sheet-body'],
      width: 600,
      height: 'auto' as const,
      top: 200,
      left: 400,
      resizable: false,
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
    });
  }

  getData(): any {
    const settingFields = game.settings.get('swade', 'settingFields');
    const data = {
      settingRules: {},
      actorSettingStats: settingFields.actor,
      itemSettingStats: settingFields.item,
      dice3d: !!game.dice3d,
      dtypes: {
        String: 'SWADE.String',
        Number: 'SWADE.Number',
        Boolean: 'SWADE.Checkbox',
        Die: 'SWADE.Die',
      },
      coreSkillPackChoices: this._buildCoreSkillPackChoices(),
      actioDeckChoices: this._buildActionDeckChoices(),
      discardPileChoices: this._buildActioDeckDiscardPileChoices(),
    };
    for (const setting of this.config.settings) {
      data.settingRules[setting] = game.settings.get('swade', setting);
    }
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('#reset').click(() => this._resetSettings());
    html.find('#submit').click(() => this.close());
    html
      .find('.attributes')
      .on('click', '.attribute-control', (e) =>
        this._onClickAttributeControl(e),
      );
  }

  async _updateObject(event, formData) {
    //Gather Data
    const expandedFormdata = expandObject(formData);
    const formActorAttrs = expandedFormdata.actorSettingStats || {};
    const formItemAttrs = expandedFormdata.itemSettingStats || {};

    //Set the "easy" settings
    for (const key in expandedFormdata.settingRules) {
      const settingValue = expandedFormdata.settingRules[key];
      if (
        this.config.settings.includes(key) &&
        settingValue !== game.settings.get('swade', key)
      ) {
        await game.settings.set('swade', key, settingValue);
      }
    }

    // Handle the free-form attributes list
    const settingFields = game.settings.get('swade', 'settingFields');
    const actorAttributes = this._handleKeyValidityCheck(formActorAttrs);
    const itemAttributes = this._handleKeyValidityCheck(formItemAttrs);
    const saveValue = {
      actor: this._handleDeletableAttributes(
        actorAttributes,
        settingFields.actor,
      ),
      item: this._handleDeletableAttributes(itemAttributes, settingFields.item),
    };
    await game.settings.set('swade', 'settingFields', saveValue);

    this.render(true);
  }

  async _resetSettings() {
    for (const setting of this.config.settings) {
      const resetValue = game.settings.settings.get(
        `swade.${setting}`,
      )!.default;
      if (game.settings.get('swade', setting) !== resetValue) {
        await game.settings.set('swade', setting, resetValue);
      }
    }
    this.render(true);
  }

  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const settingFields = game.settings.get('swade', 'settingFields') as any;
    const form = this.form;

    // Add new attribute
    if (action === 'createChar') {
      const nk = Object.keys(settingFields.actor).length + 1;
      const newElement = document.createElement('div');
      newElement.innerHTML = `<input type="text" name="actorSettingStats.attr${nk}.key" value="attr${nk}"/>`;
      const newKey = newElement.children[0];
      form?.appendChild(newKey);
      await this._onSubmit(event);
      this.render(true);
    }

    if (action === 'createItem') {
      const nk = Object.keys(settingFields.item).length + 1;
      const newElement = document.createElement('div');
      newElement.innerHTML = `<input type="text" name="itemSettingStats.attr${nk}.key" value="attr${nk}"/>`;
      const newKey = newElement.children[0];
      form?.appendChild(newKey);
      await this._onSubmit(event);
      this.render(true);
    }

    // Remove existing attribute
    if (action === 'delete') {
      const li = a.closest('.attribute');
      li.parentElement.removeChild(li);
      this._onSubmit(event).then(() => this.render(true));
    }
  }

  private _handleKeyValidityCheck(attributes: any): any {
    return Object.values(attributes).reduce((obj: any, v: any) => {
      const k = v['key'].trim();
      if (/[\s.]/.test(k)) {
        return ui.notifications.error(
          'Attribute keys may not contain spaces or periods',
        );
      }
      delete v['key'];
      obj[k] = v;
      return obj;
    }, {});
  }

  /**
   * Remove attributes which are no longer use
   * @param attributes
   * @param base
   */
  private _handleDeletableAttributes(attributes: any, base: any) {
    for (const k of Object.keys(base)) {
      if (!attributes.hasOwnProperty(k)) {
        delete attributes[k];
      }
    }
    return attributes;
  }

  private _buildCoreSkillPackChoices() {
    const retVal: Record<string, string> = {};
    game.packs
      ?.filter((p) => {
        const index = Array.from(p.index.values()).filter(
          //remove the CF entities
          (e) => e.name !== '#[CF_tempEntity]',
        );
        const isItem =
          p.metadata['type'] === 'Item' || p.metadata.entity === 'Item';
        return isItem && index.every((v) => v['type'] === 'skill');
      })
      .forEach((p) => {
        retVal[p.collection] = `${p.metadata.label} (${p.metadata.package})`;
      });
    return retVal;
  }

  private _buildActionDeckChoices() {
    const deckChoices: Record<string, string> = {};
    game.cards
      ?.filter((stack) => {
        const cards = Array.from(stack.cards.values());
        return stack.type === 'deck' && cards.every((c) => c.type === 'poker');
      })
      .forEach((d) => (deckChoices[d.id] = d.name!));
    return deckChoices;
  }

  private _buildActioDeckDiscardPileChoices() {
    const discardPiles: Record<string, string> = {};
    game.cards
      ?.filter((stack) => stack.data.type === 'pile')
      .forEach((p) => (discardPiles[p.id] = p.name!));
    return discardPiles;
  }
}
