// eslint-disable-next-line no-unused-vars
import SwadeActor from '../entities/SwadeActor';
// eslint-disable-next-line no-unused-vars
import SwadeItem from '../entities/SwadeItem';
import SwadeEntityTweaks from '../dialog/entity-tweaks';
import * as chat from '../chat';
import { SwadeDice } from '../dice';
/**
 * @noInheritDoc
 */
export default class SwadeBaseActorSheet extends ActorSheet {
  /**
   * @override
   */
  get actor(): SwadeActor {
    return super.actor as SwadeActor;
  }

  activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Update Item
    html.find('.item-edit').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.getOwnedItem(li.data('itemId'));
      item.sheet.render(true);
    });

    html.find('.item .item-controls .item-show').on('click', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.getOwnedItem(li.data('itemId')) as SwadeItem;
      item.show();
    });

    html.find('.item .item-name .item-image').on('click', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.getOwnedItem(li.data('itemId')) as SwadeItem;
      item.show();
    });

    // Edit armor modifier
    html.find('.armor-value').on('click', (ev) => {
      let target = ev.currentTarget.dataset.target;
      let shouldAutoCalcArmor = getProperty(
        this.actor.data,
        'data.details.autoCalcToughness',
      );
      if (target === 'armor' && shouldAutoCalcArmor) {
        target = 'toughness';
      }
      this._modifyDefense(target);
    });

    // Roll attribute
    html.find('.attribute-label a').on('click', (event) => {
      let element = event.currentTarget as Element;
      let attribute = element.parentElement.parentElement.dataset.attribute;
      this.actor.rollAttribute(attribute, { event: event });
    });

    // Roll Damage
    html.find('.damage-roll').on('click', (event) => {
      let element = event.currentTarget as Element;
      let itemId = $(element).parents('[data-item-id]').attr('data-item-id');
      const item = this.actor.getOwnedItem(itemId) as SwadeItem;
      return item.rollDamage();
    });

    //Add Benny
    html.find('.benny-add').on('click', () => {
      this.actor.getBenny();
    });

    //Remove Benny
    html.find('.benny-subtract').on('click', () => {
      this.actor.spendBenny();
    });

    //Toggle Conviction
    html.find('.conviction-toggle').on('click', async () => {
      const current = this.actor.data.data['details']['conviction'][
        'value'
      ] as number;
      const active = this.actor.data.data['details']['conviction'][
        'active'
      ] as boolean;
      if (current > 0 && !active) {
        await this.actor.update({
          'data.details.conviction.value': current - 1,
          'data.details.conviction.active': true,
        });
        ChatMessage.create({
          speaker: {
            actor: this.actor,
            alias: this.actor.name,
          },
          content: game.i18n.localize('SWADE ConvictionActivate'),
        });
      } else {
        await this.actor.update({
          'data.details.conviction.active': false,
        });
        chat.createConvictionEndMessage(this.actor as SwadeActor);
      }
    });

    // Filter power list
    html.find('.arcane-tabs .arcane').on('click', (ev: any) => {
      const arcane = ev.currentTarget.dataset.arcane;
      html.find('.arcane-tabs .arcane').removeClass('active');
      ev.currentTarget.classList.add('active');
      this._filterPowers(html, arcane);
    });

    //Running Die
    html.find('.running-die').on('click', (ev) => {
      const runningDie = getProperty(
        this.actor.data,
        'data.stats.speed.runningDie',
      );
      const runningMod = getProperty(
        this.actor.data,
        'data.stats.speed.runningMod',
      );
      const pace = getProperty(this.actor.data, 'data.stats.speed.value');
      let rollFormula = `1d${runningDie}`;

      rollFormula = rollFormula.concat(`+${pace}`);

      if (runningMod && runningMod !== 0) {
        rollFormula = rollFormula.concat(runningMod);
      }

      if (ev.shiftKey) {
        new Roll(rollFormula).roll().toMessage({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: game.i18n.localize('SWADE.Running'),
        });
      } else {
        SwadeDice.Roll({
          parts: [rollFormula],
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: game.i18n.localize('SWADE.Running'),
          title: game.i18n.localize('SWADE.Running'),
          actor: this.actor,
          allowGroup: false,
        });
      }
    });
  }

  getData() {
    let data: any = super.getData();

    data.config = CONFIG.SWADE;
    if (this.actor.data.type !== 'vehicle') {
      data.itemsByType = {};
      for (const item of data.items) {
        let list = data.itemsByType[item.type];
        if (!list) {
          list = [];
          data.itemsByType[item.type] = list;
        }
        list.push(item);
      }

      data.data.owned.gear = this._checkNull(data.itemsByType['gear']);
      data.data.owned.weapons = this._checkNull(data.itemsByType['weapon']);
      data.data.owned.armors = this._checkNull(data.itemsByType['armor']);
      data.data.owned.shields = this._checkNull(data.itemsByType['shield']);
      data.data.owned.edges = this._checkNull(data.itemsByType['edge']);
      data.data.owned.hindrances = this._checkNull(
        data.itemsByType['hindrance'],
      );
      data.data.owned.skills = this._checkNull(
        data.itemsByType['skill'],
      ).sort((a, b) => a.name.localeCompare(b.name));
      data.data.owned.powers = this._checkNull(data.itemsByType['power']);

      //Checks if an Actor has a Power Egde
      data.hasArcaneBackground =
        typeof data.data.owned.edges.find(
          (edge) => edge.data.isArcaneBackground === true,
        ) !== 'undefined';

      if (this.actor.data.type === 'character') {
        data.powersOptions =
          'class="powers-list resizable" data-base-size="560"';
      } else {
        data.powersOptions = 'class="powers-list"';
      }

      // Display the current active arcane
      data.activeArcane = this.options.activeArcane;
      data.arcanes = [];
      const powers = data.itemsByType['power'];
      if (powers) {
        powers.forEach((pow: any) => {
          if (!pow.data.arcane) return;
          if (
            data.arcanes.find((el: string) => el == pow.data.arcane) ===
            undefined
          ) {
            data.arcanes.push(pow.data.arcane);
            // Add powerpoints data relevant to the detected arcane
            if (data.data.powerPoints[pow.data.arcane] === undefined) {
              data.data.powerPoints[pow.data.arcane] = { value: 0, max: 0 };
            }
          }
        });
      }

      // Check for enabled optional rules
      data.data.settingrules = {
        conviction: game.settings.get('swade', 'enableConviction'),
      };
    }

    let additionalStats = data.data.additionalStats || {};
    for (let attr of Object.values(additionalStats)) {
      attr['isCheckbox'] = attr['dtype'] === 'Boolean';
    }
    data.hasAdditionalStatsFields = Object.keys(additionalStats).length > 0;
    return data;
  }

  /**
   * Extend and override the sheet header buttons
   * @override
   */
  protected _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    // Token Configuration
    const canConfigure = game.user.isGM || this.actor.owner;
    if (this.options.editable && canConfigure) {
      buttons = [
        {
          label: 'Tweaks',
          class: 'configure-actor',
          icon: 'fas fa-dice',
          onclick: (ev) => this._onConfigureEntity(ev),
        },
      ].concat(buttons);
    }
    return buttons;
  }

  protected _onConfigureEntity(event: Event) {
    event.preventDefault();
    new SwadeEntityTweaks(this.actor, {
      top: this.position.top + 40,
      left: this.position.left + ((this.position.height as number) - 400) / 2,
    }).render(true);
  }

  protected async _chooseItemType(
    choices = ['weapon', 'armor', 'shield', 'gear'],
  ) {
    let templateData = {
        types: choices,
        hasTypes: true,
        name: game.i18n
          .localize('ENTITY.New')
          .replace('{entity}', game.i18n.localize('ENTITY.Item')),
      },
      dlg = await renderTemplate(
        'templates/sidebar/entity-create.html',
        templateData,
      );
    //Create Dialog window
    return new Promise((resolve) => {
      new Dialog({
        title: game.i18n
          .localize('ENTITY.Create')
          .replace('{entity}', game.i18n.localize('ENTITY.Item')),
        content: dlg,
        buttons: {
          ok: {
            label: game.i18n.localize('SWADE.Ok'),
            icon: '<i class="fas fa-check"></i>',
            callback: (html: JQuery) => {
              resolve({
                type: html.find('select[name="type"]').val(),
                name: html.find('input[name="name"]').val(),
              });
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize('SWADE.Cancel'),
          },
        },
        default: 'ok',
      }).render(true);
    });
  }

  protected _checkNull(items: Item[]): Item[] {
    if (items && items.length) {
      return items;
    }
    return [];
  }

  protected async _onResize(event: any) {
    super._onResize(event);
    let html = $(event.path);
    const selector = `#${this.id} .resizable`;
    let resizable = html.find(selector);
    resizable.each((_, el) => {
      let heightDelta =
        (this.position.height as number) - (this.options.height as number);
      el.style.height = `${heightDelta + parseInt(el.dataset.baseSize)}px`;
    });
  }

  protected _modifyDefense(target: string) {
    let targetLabel;
    let targetProperty;
    switch (target) {
      case 'parry':
        targetLabel = `${game.i18n.localize(
          'SWADE.Parry',
        )} ${game.i18n.localize('SWADE.Mod')}`;
        targetProperty = 'parry.modifier';
        break;
      case 'armor':
        targetLabel = `${game.i18n.localize('SWADE.Armor')}`;
        targetProperty = 'toughness.armor';
        break;
      case 'toughness':
        targetLabel = `${game.i18n.localize(
          'SWADE.Tough',
        )} ${game.i18n.localize('SWADE.Mod')}`;
        targetProperty = 'toughness.modifier';
        break;
      default:
        targetLabel = `${game.i18n.localize(
          'SWADE.Tough',
        )} ${game.i18n.localize('SWADE.Mod')}`;
        targetProperty = 'toughness.value';
        break;
    }

    const targetPropertyPath = `data.stats.${targetProperty}`;
    const targetPropertyValue = getProperty(
      this.actor.data,
      targetPropertyPath,
    );

    let title = `${game.i18n.localize('SWADE.Ed')} ${
      this.actor.name
    } ${targetLabel}`;

    const template = `
      <form><div class="form-group">
        <label>${game.i18n.localize('SWADE.Ed')} ${targetLabel}</label> 
        <input name="modifier" value="${targetPropertyValue}" type="text"/>
      </div></form>`;
    new Dialog({
      title: title,
      content: template,
      buttons: {
        set: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('SWADE.Ok'),
          callback: (html: JQuery) => {
            let mod = html.find('input[name="modifier"]').val();
            let newData = {};
            newData[targetPropertyPath] = parseInt(mod as string);
            this.actor.update(newData);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('SWADE.Cancel'),
        },
      },
      default: 'set',
    }).render(true);
  }

  protected _calcInventoryWeight(items): number {
    let retVal = 0;
    items.forEach((category: any) => {
      category.forEach((i: any) => {
        retVal += i.data.weight * i.data.quantity;
      });
    });
    return retVal;
  }

  protected _filterPowers(html: JQuery, arcane: string) {
    this.options.activeArcane = arcane;
    // Show, hide powers
    html.find('.power').each((id: number, pow: any) => {
      if (pow.dataset.arcane == arcane || arcane == 'All') {
        pow.classList.add('active');
      } else {
        pow.classList.remove('active');
      }
    });
    // Show, Hide powerpoints
    html.find('.power-counter').each((id: number, ct: any) => {
      if (ct.dataset.arcane == arcane) {
        ct.classList.add('active');
      } else {
        ct.classList.remove('active');
      }
    });
  }

  /** @override */
  render(force?: boolean, options?: RenderOptions) {
    if (!CONFIG.SWADE.templates.templatesPreloaded) {
      console.log('Templates not loaded yet, waiting');
      CONFIG.SWADE.templates.preloadPromise.then(() => {
        console.log('Templates loaded, rendering');
        CONFIG.SWADE.templates.templatesPreloaded = true;
        super.render(force, options);
      });
    } else {
      console.log('Templates loaded, rendering');
      return super.render(force, options);
    }
  }
}
