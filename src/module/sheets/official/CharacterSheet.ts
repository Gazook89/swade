import { SWADE } from '../../config';
import SwadeActor from '../../entities/SwadeActor';
import SwadeItem from '../../entities/SwadeItem';
import ItemChatCardHelper from '../../ItemChatCardHelper';

export default class CharacterSheet extends ActorSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['swade-official', 'sheet', 'actor'],
      width: 630,
      height: 700,
      resizable: true,
      tabs: [
        {
          navSelector: '.tabs',
          contentSelector: '.sheet-body',
          initial: 'summary',
        },
      ],
    });
  }

  get template() {
    return 'systems/swade/templates/official/sheet.html';
  }

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

    // Drag events for macros.
    if (this.actor.owner) {
      const handler = (ev) => this._onDragStart(ev);
      // Find all items on the character sheet.
      html.find('li.item.skill').each((i, li) => {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', handler, false);
      });
      html.find('li.item.weapon').each((i, li) => {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', handler, false);
      });
      html.find('li.item.armor').each((i, li) => {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', handler, false);
      });
      html.find('li.item.misc').each((i, li) => {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', handler, false);
      });
      html.find('li.item.power').each((i, li) => {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', handler, false);
      });
    }

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
            actor: this.actor,
            alias: this.actor.name,
          },
          content: game.i18n.localize('SWADE.ConvictionActivate'),
        });
      } else {
        await this.actor.update({
          'data.details.conviction.active': false,
        });
      }
    });

    html.find('.add-benny').on('click', () => {
      this.actor.getBenny();
    });

    html.find('.spend-benny').on('click', () => {
      this.actor.spendBenny();
    });

    //Roll Attribute
    html.find('.attribute-label').on('click', (ev) => {
      const element = ev.currentTarget as Element;
      const attribute = element.parentElement.dataset.attribute;
      this.actor.rollAttribute(attribute, { event: ev });
    });

    //Toggle Equipment Card collapsible
    html.find('.skill-card .skill-name.item-name').on('click', (ev) => {
      $(ev.currentTarget)
        .parents('.item.skill.skill-card')
        .find('.card-content')
        .slideToggle();
    });

    // Roll Skill
    html.find('.skill-card .skill-die').on('click', (ev) => {
      const element = ev.currentTarget as HTMLElement;
      const item = element.parentElement.dataset.itemId;
      this.actor.rollSkill(item, { event: ev });
    });

    //Running Die
    html.find('.running-die').on('click', () => {
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

      new Roll(rollFormula).roll().toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: game.i18n.localize('SWADE.Running'),
      });
    });

    // Roll Damage
    html.find('.damage-roll').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.getOwnedItem(li.data('itemId')) as SwadeItem;
      return item.rollDamage();
    });

    //Toggle Equipment Card collapsible
    html.find('.gear-card .item-name').on('click', (ev) => {
      $(ev.currentTarget)
        .parents('.gear-card')
        .find('.card-content')
        .slideToggle();
    });

    html.find('.item-edit').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.getOwnedItem(li.data('itemId'));
      item.sheet.render(true);
    });

    html.find('.item-show').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.getOwnedItem(li.data('itemId')) as SwadeItem;
      item.show();
    });

    // Delete Item
    html.find('.item-delete').on('click', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const ownedItem = this.actor.getOwnedItem(li.data('itemId'));
      const template = `
      <form>
        <div>
          <center>${game.i18n.localize('Delete')}
            <strong>${ownedItem.name}</strong>?
          </center>
          <br>
        </div>
      </form>`;
      await Dialog.confirm({
        title: game.i18n.localize('Delete'),
        content: template,
        yes: () => {
          li.slideUp(200, () => this.actor.deleteOwnedItem(ownedItem.id));
        },
        no: () => {},
      });
    });

    html.find('.item-create').on('click', async (ev) => {
      const header = ev.currentTarget;
      const type = header.dataset.type;

      // item creation helper func
      const createItem = function (
        type: string,
        name: string = `New ${type.capitalize()}`,
      ): any {
        const itemData = {
          name: name ? name : `New ${type.capitalize()}`,
          type: type,
          data: duplicate(header.dataset),
        };
        delete itemData.data['type'];
        return itemData;
      };
      switch (type) {
        case 'choice':
          this._chooseItemType().then(async (dialogInput: any) => {
            if (dialogInput.type !== 'effect') {
              const itemData = createItem(dialogInput.type, dialogInput.name);
              await this.actor.createOwnedItem(itemData, { renderSheet: true });
            } else {
              this._createActiveEffect();
            }
          });
          break;
        case 'effect':
          this._createActiveEffect();
          break;
        default:
          await this.actor.createOwnedItem(createItem(type), {
            renderSheet: true,
          });
          break;
      }
    });

    //Toggle Equipment
    html.find('.item-toggle').on('click', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.getOwnedItem(li.data('itemId')) as SwadeItem;
      await this.actor.updateOwnedItem(
        this._toggleEquipped(li.data('itemId'), item),
      );
      if (item.type === 'armor') {
        await this.actor.update({
          'data.stats.toughness.armor': this.actor.calcArmor(),
        });
      }
    });

    html.find('.effect-action').on('click', (ev) => {
      const a = ev.currentTarget;
      const effectId = a.closest('li').dataset.effectId;
      const effect = this.actor['effects'].get(effectId) as any;
      const action = a.dataset.action;

      switch (action) {
        case 'edit':
          return effect.sheet.render(true);
        case 'delete':
          return effect.delete();
        case 'toggle':
          return effect.update({ disabled: !effect.data.disabled });
      }
    });

    html.find('.edge-hindrance .item-name button').on('click', (ev) => {
      $(ev.currentTarget)
        .parents('.edge-hindrance')
        .find('.description')
        .slideToggle();
    });

    html.find('.power .item-name button').on('click', (ev) => {
      $(ev.currentTarget).parents('.power').find('.description').slideToggle();
    });

    html.find('.armor-display').on('click', () => {
      const armorPropertyPath = 'data.stats.toughness.armor';
      const armorvalue = getProperty(this.actor.data, armorPropertyPath);
      const label = game.i18n.localize('SWADE.Armor');
      const template = `
      <form><div class="form-group">
        <label>${game.i18n.localize('SWADE.Ed')} ${label}</label>
        <input name="modifier" value="${armorvalue}" type="number"/>
      </div></form>`;

      new Dialog({
        title: `${game.i18n.localize('SWADE.Ed')} ${this.actor.name} ${label}`,
        content: template,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize('SWADE.Ok'),
            callback: (html: JQuery) => {
              const newData = {};
              newData[armorPropertyPath] = html
                .find('input[name="modifier"]')
                .val();
              this.actor.update(newData);
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize('Cancel'),
          },
        },
        default: 'ok',
      }).render(true);
    });

    html.find('.parry-display').on('click', () => {
      const parryPropertyPath = 'data.stats.parry.modifier';
      const parryMod = getProperty(
        this.actor.data,
        parryPropertyPath,
      ) as number;
      const label = game.i18n.localize('SWADE.Parry');
      const template = `
      <form><div class="form-group">
        <label>${game.i18n.localize('SWADE.Ed')} ${label}</label>
        <input name="modifier" value="${parryMod}" type="number"/>
      </div></form>`;

      new Dialog({
        title: `${game.i18n.localize('SWADE.Ed')} ${this.actor.name} ${label}`,
        content: template,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize('SWADE.Ok'),
            callback: (html: JQuery) => {
              const newData = {};
              newData[parryPropertyPath] = html
                .find('input[name="modifier"]')
                .val() as number;
              this.actor.update(newData);
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize('Cancel'),
          },
        },
        default: 'ok',
      }).render(true);
    });

    //Item Action Buttons
    html.find('.card-buttons button').on('click', async (ev) => {
      const button = ev.currentTarget;
      const action = button.dataset['action'];
      const itemId = $(button).parents('.chat-card.item-card').data().itemId;
      ItemChatCardHelper.handleAction(
        this.actor.getOwnedItem(itemId) as SwadeItem,
        this.actor,
        action,
      );

      //handle Power Item Card PP adjustment
      if (action === 'pp-adjust') {
        const ppToAdjust = $(button)
          .closest('.flexcol')
          .find('input.pp-adjust')
          .val() as string;
        const adjustment = button.getAttribute('data-adjust') as string;
        const power = this.actor.getOwnedItem(itemId);
        let key = 'data.powerPoints.value';
        const arcane = getProperty(power.data, 'data.arcane');
        if (arcane) key = `data.powerPoints.${arcane}.value`;
        let newPP = getProperty(this.actor.data, key);
        if (adjustment === 'plus') {
          newPP += parseInt(ppToAdjust);
        } else if (adjustment === 'minus') {
          newPP -= parseInt(ppToAdjust);
        }
        await this.actor.update({ [key]: newPP });
      }
    });
  }

  getData() {
    const data: any = super.getData();

    data.bennyImageURL = SWADE.bennies.sheetImage;
    data.itemsByType = {};
    for (const type of game.system.entityTypes.Item) {
      data.itemsByType[type] = data.items.filter((i) => i.type === type) || [];
    }

    for (const type of Object.keys(data.itemsByType)) {
      for (const item of data.itemsByType[type]) {
        // Basic template rendering data
        const ammoManagement = game.settings.get('swade', 'ammoManagement');
        item.shots = getProperty(item, 'data.shots');
        item.currentShots = getProperty(item, 'data.currentShots');

        item.isMeleeWeapon =
          'weapon' &&
          ((!item.shots && !item.currentShots) ||
            (item.shots === '0' && item.currentShots === '0'));

        const actions = getProperty(item, 'data.actions.additional');
        item.hasAdditionalActions =
          !!actions && Object.keys(actions).length > 0;

        item.actions = [];

        for (const action in actions) {
          item.actions.push({
            key: action,
            type: actions[action].type,
            name: actions[action].name,
          });
        }

        item.actor = data.actor;
        item.config = SWADE;
        item.hasAmmoManagement =
          item.type === 'weapon' &&
          !item.isMeleeWeapon &&
          ammoManagement &&
          !getProperty(item, 'data.autoReload');
        item.hasReloadButton =
          ammoManagement &&
          item.type === 'weapon' &&
          getProperty(item, 'data.shots') > 0 &&
          !getProperty(item, 'data.autoReload');
        item.hasDamage =
          !!getProperty(item, 'data.damage') ||
          !!item.actions.find((action) => action.type === 'damage');
        item.skill =
          getProperty(item, 'data.actions.skill') ||
          !!item.actions.find((action) => action.type === 'skill');
        item.hasSkillRoll =
          ['weapon', 'power', 'shield'].includes(item.type) &&
          !!getProperty(item, 'data.actions.skill');
        item.powerPoints = getPowerPoints(item);
      }
    }

    //sort skills alphabetically
    data.sortedSkills = data.itemsByType['skill'];
    data.sortedSkills.sort((a, b) => a.name.localeCompare(b.name));

    data.currentBennies = [];
    const bennies = getProperty(
      this.actor.data,
      'data.bennies.value',
    ) as number;
    for (let i = 0; i < bennies; i++) {
      data.currentBennies.push(i + 1);
    }

    const additionalStats = data.data.additionalStats || {};
    for (const attr of Object.values(additionalStats)) {
      attr['isCheckbox'] = attr['dtype'] === 'Boolean';
    }
    data.hasAdditionalStatsFields = Object.keys(additionalStats).length > 0;

    //Encumbrance
    data.inventoryWeight = this._calcInventoryWeight([
      ...data.itemsByType['gear'],
      ...data.itemsByType['weapon'],
      ...data.itemsByType['armor'],
      ...data.itemsByType['shield'],
    ]);
    data.maxCarryCapacity = this.actor.calcMaxCarryCapacity();

    //Checks if the Actor has an Arcane Background
    data.hasArcaneBackground = this.actor.hasArcaneBackground;

    //Deal with ABs and Powers
    const powers = {
      arcanes: {},
      arcanesCount: data.itemsByType.power
        .map((p) => {
          return p.data.arcane;
        })
        .filter(Boolean).length,
      hasPowersWithoutArcane:
        data.itemsByType.power.reduce((acc, cur) => {
          if (cur.data.arcane) {
            return acc;
          } else {
            return (acc += 1);
          }
        }, 0) > 0,
    };

    for (const power of data.itemsByType.power) {
      const arcane = power.data.arcane;
      if (!arcane) {
        continue;
      }
      if (!powers.arcanes[arcane]) {
        powers.arcanes[arcane] = {
          valuePath: `data.powerPoints.${arcane}.value`,
          value: getProperty(
            this.actor.data,
            `data.powerPoints.${arcane}.value`,
          ),
          maxPath: `data.powerPoints.${arcane}.max`,
          max: getProperty(this.actor.data, `data.powerPoints.${arcane}.max`),
          powers: [],
        };
      }
      powers.arcanes[arcane].powers.push(power);
    }

    data.powers = powers;

    const shields = data.itemsByType['shield'];
    data.parry = 0;
    if (shields) {
      shields.forEach((shield: SwadeItem) => {
        if (shield.data['equipped']) {
          data.parry += parseInt(shield.data['parry']);
        }
      });
    }
    // Check for enabled optional rules
    data.settingrules = {
      conviction: game.settings.get('swade', 'enableConviction'),
    };
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
          label: game.i18n.localize('SWADE.Tweaks'),
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
    new game.swade.SwadeEntityTweaks(this.actor, {
      top: this.position.top + 40,
      left: this.position.left + ((this.position.height as number) - 400) / 2,
    }).render(true);
  }

  protected _calcInventoryWeight(items): number {
    let retVal = 0;
    items.forEach((i: any) => {
      retVal += i.data.weight * i.data.quantity;
    });
    return retVal;
  }

  private _toggleEquipped(id: string, item: any): any {
    return {
      _id: id,
      data: {
        equipped: !item.data.data.equipped,
      },
    };
  }

  protected async _chooseItemType(choices?: any) {
    if (!choices) {
      choices = {
        weapon: game.i18n.localize('ITEM.TypeWeapon'),
        armor: game.i18n.localize('ITEM.TypeArmor'),
        shield: game.i18n.localize('ITEM.TypeShield'),
        gear: game.i18n.localize('ITEM.TypeGear'),
        effect: 'Active Effect',
      };
    }
    const templateData = {
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
            label: game.i18n.localize('ENTITY.CreateNew'),
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
            label: game.i18n.localize('Cancel'),
          },
        },
        default: 'ok',
      }).render(true);
    });
  }

  protected async _createActiveEffect() {
    const id = (
      await this.actor.createEmbeddedEntity('ActiveEffect', {
        label: game.i18n
          .localize('ENTITY.New')
          .replace('{entity}', game.i18n.localize('Active Effect')),
        icon: '/icons/svg/mystery-man-black.svg',
      })
    )._id;
    return this.actor['effects'].get(id).sheet.render(true);
  }
}

function getPowerPoints(item) {
  if (item.type !== 'power') return {};

  const arcane = getProperty(item, 'data.arcane');
  let current = getProperty(item.actor, 'data.powerPoints.value');
  let max = getProperty(item.actor, 'data.powerPoints.max');
  if (arcane) {
    current = getProperty(item.actor, `data.powerPoints.${arcane}.value`);
    max = getProperty(item.actor, `data.powerPoints.${arcane}.max`);
  }
  return { current, max };
}
