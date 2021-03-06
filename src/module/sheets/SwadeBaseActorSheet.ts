import { AdditionalStat, TraitRollModifier } from '../../interfaces/additional';
import SwadeDocumentTweaks from '../apps/SwadeDocumentTweaks';
import * as chat from '../chat';
import { SWADE } from '../config';
import SwadeItem from '../documents/item/SwadeItem';
/**
 * @noInheritDoc
 */
export default class SwadeBaseActorSheet extends ActorSheet {
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    const inputs = html.find('input');
    inputs.on('focus', (ev) => ev.currentTarget.select());
    inputs
      .addBack()
      .find('[data-dtype="Number"]')
      .on('change', this._onChangeInputDelta.bind(this));

    if (this.actor.isOwner) {
      const handler = (ev: DragEvent) => this._onDragStart(ev);
      html.find('li.active-effect').each((i, li) => {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', handler, false);
      });
    }

    // Update Item
    html.find('.item-edit').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item?.sheet?.render(true);
    });

    html.find('.item .item-controls .item-show').on('click', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'))!;
      item.show();
    });

    html.find('.item .item-name .item-image').on('click', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'))!;
      item.show();
    });

    // Edit armor modifier
    html.find('.armor-value').on('click', (ev) => {
      let target = ev.currentTarget.dataset.target ?? '';
      const shouldAutoCalcArmor = getProperty(
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
      const element = event.currentTarget;
      const attribute = element.parentElement!.parentElement!.dataset
        .attribute! as keyof typeof SWADE.attributes;
      this.actor.rollAttribute(attribute);
    });

    // Roll Damage
    html.find('.damage-roll').on('click', (event) => {
      const element = event.currentTarget as Element;
      const itemId = $(element).parents('[data-item-id]').attr('data-item-id')!;
      const item = this.actor.items.get(itemId);
      return item!.rollDamage();
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
      const current = getProperty(
        this.actor.data,
        'data.details.conviction.value',
      ) as number;
      const active = getProperty(
        this.actor.data,
        'data.details.conviction.active',
      ) as boolean;

      if (current > 0 && !active) {
        await this.actor.update({
          'data.details.conviction.value': current - 1,
          'data.details.conviction.active': true,
        });
        ChatMessage.create({
          speaker: {
            actor: this.actor.id,
            alias: this.actor.name,
          },
          content: game.i18n.localize('SWADE.ConvictionActivate'),
        });
      } else {
        await this.actor.update({
          'data.details.conviction.active': false,
        });
        await chat.createConvictionEndMessage(this.actor);
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
    html.find('.running-die').on('click', async (ev) => {
      if (this.actor.data.type === 'vehicle') return;

      const runningDieSides = this.actor.data.data.stats.speed.runningDie;
      const runningMod = this.actor.data.data.stats.speed.runningMod;
      const pace = this.actor.data.data.stats.speed.adjusted;
      const runningDie = `1d${runningDieSides}[${game.i18n.localize(
        'SWADE.RunningDie',
      )}]`;
      const mods: TraitRollModifier[] = [
        { label: game.i18n.localize('SWADE.Pace'), value: pace.signedString() },
      ];

      if (runningMod) {
        mods.push({
          label: 'Modifier',
          value: runningMod.signedString(),
        });
      }
      if (ev.shiftKey) {
        const rollFormula =
          runningDie + runningMod.signedString() + pace.signedString();
        const runningRoll = new Roll(rollFormula);
        await runningRoll.evaluate({ async: true });
        await runningRoll.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: game.i18n.localize('SWADE.Running'),
        });
        return;
      }
      game.swade.RollDialog.asPromise({
        roll: new Roll(runningDie),
        mods: mods,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: game.i18n.localize('SWADE.Running'),
        title: game.i18n.localize('SWADE.Running'),
        actor: this.actor,
        allowGroup: false,
      });
    });

    html.find('.effect-action').on('click', (ev) => {
      const a = ev.currentTarget;
      const effectId = a.closest('li')!.dataset.effectId!;
      const effect = this.actor.effects.get(effectId, { strict: true });
      const action = a.dataset.action;

      switch (action) {
        case 'edit':
          return effect.sheet?.render(true);
        case 'delete':
          return effect.delete();
        case 'toggle':
          return effect.update({ disabled: !effect?.data.disabled });
        case 'open-origin':
          fromUuid(effect!.data?.origin!).then((item: SwadeItem) => {
            if (item) this.actor.items.get(item.id!)!.sheet?.render(true);
          });
          break;
        default:
          console.warn(`The action ${action} is not currently supported`);
          break;
      }
    });

    html.find('.add-effect').on('click', async (ev) => {
      const transfer = $(ev.currentTarget).data('transfer');
      const effect = await CONFIG.ActiveEffect.documentClass.create(
        {
          label: game.i18n.format('DOCUMENT.New', {
            type: game.i18n.localize('DOCUMENT.ActiveEffect'),
          }),
          icon: '/icons/svg/mystery-man-black.svg',
          transfer: transfer,
        },
        { renderSheet: true, parent: this.actor },
      );
      this.actor.effects.get(effect?.id!, { strict: true }).sheet?.render(true);
    });

    html.find('.additional-stats .roll').on('click', async (ev) => {
      const button = ev.currentTarget;
      const stat = button.dataset.stat;
      const statData = getProperty(
        this.actor.data,
        `data.additionalStats.${stat}`,
      ) as AdditionalStat;
      let modifier = statData.modifier || '';
      if (!!modifier && !modifier.match(/^[+-]/)) {
        modifier = '+' + modifier;
      }
      const roll = new Roll(
        `${statData.value}${modifier}`,
        this.actor.getRollData(),
      );
      await roll.evaluate({ async: true });
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker(),
        flavor: statData.label,
      });
    });

    //Wealth Die Roll
    html.find('.currency .roll').on('click', () => this.actor.rollWealthDie());
  }

  getData() {
    const data: any = super.getData();
    data.config = SWADE;

    data.itemsByType = {};
    for (const type of game.system.documentTypes.Item) {
      data.itemsByType[type] = data.items.filter((i) => i.type === type) || [];
    }
    data.itemsByType.skill.sort((a: SwadeItem, b: SwadeItem) =>
      a.name!.localeCompare(b.name!),
    );

    if (this.actor.data.type !== 'vehicle') {
      //Encumbrance
      data.inventoryWeight = this._calcInventoryWeight([
        ...data.itemsByType['gear'],
        ...data.itemsByType['weapon'],
        ...data.itemsByType['armor'],
        ...data.itemsByType['shield'],
      ]);
      data.maxCarryCapacity = this.actor.calcMaxCarryCapacity();

      if (this.actor.data.type === 'character') {
        data.powersOptions =
          'class="powers-list resizable" data-base-size="560"';
      } else {
        data.powersOptions = 'class="powers-list"';
      }

      // Display the current active arcane
      data.activeArcane = this.options['activeArcane'];
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
            if (
              !hasProperty(data, `data.data.powerPoints.${pow.data.arcane}`)
            ) {
              data.data.data.powerPoints[pow.data.arcane] = {
                value: 0,
                max: 0,
              };
            }
          }
        });
      }

      // Check for enabled optional rules
      data.settingrules = {
        conviction: game.settings.get('swade', 'enableConviction'),
        noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
        wealthType: game.settings.get('swade', 'wealthType'),
        currencyName: game.settings.get('swade', 'currencyName'),
      };
    }

    const additionalStats: Record<string, AdditionalStat> =
      data.data.data.additionalStats || {};
    for (const attr of Object.values(additionalStats)) {
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
    if (this.actor.isOwner) {
      buttons = [
        {
          label: game.i18n.localize('SWADE.Tweaks'),
          class: 'configure-actor',
          icon: 'fas fa-dice',
          onclick: (ev) => this._onConfigureEntity(ev),
        },
        ...buttons,
      ];
    }
    return buttons;
  }

  protected _onConfigureEntity(event: JQuery.ClickEvent) {
    event.preventDefault();
    new SwadeDocumentTweaks(this.actor).render(true);
  }

  protected async _chooseItemType(
    choices?: any,
  ): Promise<{ type: string; name: string }> {
    if (!choices) {
      choices = {
        weapon: game.i18n.localize('ITEM.TypeWeapon'),
        armor: game.i18n.localize('ITEM.TypeArmor'),
        shield: game.i18n.localize('ITEM.TypeShield'),
        gear: game.i18n.localize('ITEM.TypeGear'),
      };
    }
    const templateData = {
        types: choices,
        hasTypes: true,
        name: game.i18n.format('DOCUMENT.New', {
          type: game.i18n.localize('DOCUMENT.Item'),
        }),
      },
      dlg = await renderTemplate(
        'templates/sidebar/document-create.html',
        templateData,
      );
    //Create Dialog window
    return new Promise((resolve) => {
      new Dialog({
        title: game.i18n.format('DOCUMENT.Create', {
          type: game.i18n.localize('DOCUMENT.Item'),
        }),
        content: dlg,
        buttons: {
          ok: {
            label: game.i18n.localize('SWADE.Ok'),
            icon: '<i class="fas fa-check"></i>',
            callback: (html: JQuery<HTMLElement>) => {
              resolve({
                type: html.find('select[name="type"]').val() as string,
                name: html.find('input[name="name"]').val() as string,
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
    const html = $(event.path);
    const selector = `#${this.id} .resizable`;
    const resizable = html.find(selector);
    resizable.each((_, el) => {
      const heightDelta =
        (this.position.height as number) - (this.options.height as number);
      el.style.height = `${heightDelta + parseInt(el.dataset.baseSize!)}px`;
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
        )} ${game.i18n.localize('SWADE.Modifier')}`;
        targetProperty = 'toughness.modifier';
        break;
      default:
        targetLabel = `${game.i18n.localize(
          'SWADE.Tough',
        )} ${game.i18n.localize('SWADE.Modifier')}`;
        targetProperty = 'toughness.value';
        break;
    }

    const targetPropertyPath = `data.stats.${targetProperty}`;
    const targetPropertyValue = getProperty(
      this.actor.data,
      targetPropertyPath,
    );

    const title = `${game.i18n.localize('SWADE.Ed')} ${
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
            const mod = html.find('input[name="modifier"]').val();
            const newData = {};
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
    items.forEach((i: any) => {
      retVal += i.data.weight * i.data.quantity;
    });
    return retVal;
  }

  protected _filterPowers(html: JQuery, arcane: string) {
    this.options['activeArcane'] = arcane;
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

  /**
   * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs
   * @param {Event} event  Triggering event.
   */
  protected _onChangeInputDelta(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (['+', '-'].includes(value[0])) {
      const delta = parseInt(value, 10);
      input.value = getProperty(this.actor.data, input.name) + delta;
    } else if (value[0] === '=') {
      input.value = value.slice(1);
    }
  }
}
