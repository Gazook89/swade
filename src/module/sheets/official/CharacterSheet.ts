import { ActiveEffectDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/activeEffectData';
import { Attribute, StatusEffect } from '../../../globals';
import {
  AdditionalStat,
  ItemAction,
  TraitRollModifier,
} from '../../../interfaces/additional';
import { Advance } from '../../../interfaces/Advance';
import { AdvanceEditor } from '../../apps/AdvanceEditor';
import { SWADE } from '../../config';
import { constants } from '../../constants';
import SwadeItem from '../../documents/item/SwadeItem';
import SwadeActiveEffect from '../../documents/SwadeActiveEffect';
import ItemChatCardHelper from '../../ItemChatCardHelper';
import * as util from '../../util';

export default class CharacterSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      ...super.defaultOptions,
      classes: ['swade-official', 'sheet', 'actor'],
      width: 630,
      height: 700,
      resizable: true,
      scrollY: ['section.tab'],
      tabs: [
        {
          navSelector: '.tabs',
          contentSelector: '.sheet-body',
          initial: 'summary',
        },
        {
          navSelector: '.about-tabs',
          contentSelector: '.about-body',
          initial: 'advances',
        },
      ],
    });
  }

  get template() {
    return 'systems/swade/templates/official/sheet.hbs';
  }

  activateListeners(html: JQuery<HTMLFormElement>): void {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    this.form!.addEventListener('keypress', (ev: KeyboardEvent) => {
      const target = ev.target as HTMLButtonElement;
      const targetIsButton = 'button' === target?.type;
      if (!targetIsButton && ev.key === 'Enter') {
        ev.preventDefault();
        this.submit({ preventClose: true });
        return false;
      }
    });

    // Input focus and update
    const inputs = html.find('input');
    inputs.on('focus', (ev) => ev.currentTarget.select());

    inputs
      .addBack()
      .find('[data-dtype="Number"]')
      .on('change', this._onChangeInputDelta.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
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
      html.find('li.item.shield').each((i, li) => {
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
      html.find('li.active-effect').each((i, li) => {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', handler, false);
      });
      html.find('li.item.edge-hindrance').each((i, li) => {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', handler, false);
      });

      html
        .find('.status input[type="checkbox"]')
        .on('change', async (event) => {
          // Get the key from the target name
          const id = event.target.dataset.id as string;
          const key = event.target.dataset.key as string;
          const statusConfigData = SWADE.statusEffects.find(
            (effect) => effect.id === id,
          ) as StatusEffect;
          await this.actor.update({
            'data.status': {
              [key]: false,
            },
          });
          this.actor.toggleActiveEffect(statusConfigData);
        });
    }

    //Display Advances on About tab
    html.find('label.advances').on('click', async () => {
      this._tabs[1].activate('advances');
      this._tabs[0].activate('about');
    });

    //Toggle char detail inputs
    html
      .find('.character-detail button')
      .on('click', this._setupCharacterDetailInput.bind(this));

    //Toggle Conviction
    html.find('.conviction-toggle').on('click', async () => {
      if (this.actor.data.type === 'vehicle') return;
      const current = this.actor.data.data.details.conviction.value;
      const active = this.actor.data.data.details.conviction.active;
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
      const attribute = ev.currentTarget.parentElement!.dataset
        .attribute! as Attribute;
      this.actor.rollAttribute(attribute);
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
      const item = element.parentElement!.dataset.itemId!;
      this.actor.rollSkill(item);
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
        { label: game.i18n.localize('SWADE.Pace'), value: pace },
      ];

      if (runningMod) {
        mods.push({
          label: game.i18n.localize('SWADE.Modifier'),
          value: runningMod,
        });
      }

      if (this.actor.isEncumbered) {
        mods.push({
          label: game.i18n.localize('SWADE.Encumbered'),
          value: -2,
        });
      }

      if (ev.shiftKey) {
        const rollFormula =
          runningDie +
          mods.reduce((acc: string, cur: TraitRollModifier) => {
            return acc + cur.value + `[${cur.label}]`;
          }, '');
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

    // Roll Damage
    html.find('.damage-roll').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'))!;
      return item.rollDamage();
    });

    //Toggle Equipment Card collapsible
    html.find('.gear-card .item-name').on('click', (ev) => {
      $(ev.currentTarget)
        .parents('.gear-card')
        .find('.card-content')
        .slideToggle();
    });

    //Edit Item
    html.find('.item-edit').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'), { strict: true });
      item.sheet?.render(true);
    });

    //Show Item
    html.find('.item-show').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'), { strict: true });
      item.show();
    });

    // Delete Item
    html.find('.item-delete').on('click', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'), {
        strict: true,
      });
      const template = `
      <form>
        <div style="text-align: center;">
          <p>
          ${game.i18n.localize('Delete')} <strong>${item.name}</strong>?
          </p>
        </div>
      </form>`;
      await Dialog.confirm({
        title: game.i18n.localize('Delete'),
        content: template,
        yes: () => {
          li.slideUp(200, () => item.delete());
        },
        no: () => {},
      });
    });

    html.find('.item-create').on('click', async (ev) => {
      this._inlineItemCreate(ev.currentTarget as HTMLButtonElement);
    });

    //Toggle Equipment Status
    html.find('.item-toggle').on('click', async (ev) => {
      const target = ev.currentTarget;
      const li = $(target).parents('.item');
      const itemID = li.data('itemId');
      const item = this.actor.items.get(itemID, { strict: true });
      const toggle = target.dataset.toggle as string;
      await item.update(this._toggleItem(item, toggle));
    });

    html.find('.effect-action').on('click', async (ev) => {
      const a = ev.currentTarget;
      const effectId = a.closest('li')!.dataset.effectId as string;
      const effect = this.actor.effects.get(effectId, { strict: true });
      const action = a.dataset.action as string;
      const toggle = a.dataset.toggle as string;
      let item: SwadeItem | null = null;

      switch (action) {
        case 'edit':
          return effect.sheet?.render(true);
        case 'delete':
          return effect.delete();
        case 'toggle':
          return effect.update(this._toggleItem(effect, toggle));
        case 'open-origin':
          item = (await fromUuid(effect.data.origin!)) as SwadeItem;
          if (item) item?.sheet?.render(true);
          break;
        default:
          console.warn(`The action ${action} is not currently supported`);
          break;
      }
    });

    html.find('.item .item-name').on('click', (ev) => {
      $(ev.currentTarget).parents('.item').find('.description').slideToggle();
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
      const action = button.dataset.action!;
      const itemId = $(button).parents('.chat-card.item-card').data().itemId;
      const item = this.actor.items.get(itemId, { strict: true });
      const additionalMods = new Array<TraitRollModifier>();
      const ppToAdjust = $(button)
        .parents('.chat-card.item-card')
        .find('input.pp-adjust')
        .val() as string;
      const arcaneDevicePPToAdjust = $(button)
        .parents('.chat-card.item-card')
        .find('input.arcane-device-pp-adjust')
        .val() as string;

      //if it's a power and the No Power Points rule is in effect
      if (
        item.type === 'power' &&
        game.settings.get('swade', 'noPowerPoints')
      ) {
        let modifier = Math.ceil(parseInt(ppToAdjust, 10) / 2);
        modifier = Math.min(modifier * -1, modifier);
        const actionObj = getProperty(
          item.data,
          `data.actions.additional.${action}.skillOverride`,
        ) as ItemAction;
        //filter down further to make sure we only apply the penalty to a trait roll
        if (
          action === 'formula' ||
          (!!actionObj && actionObj.type === 'skill')
        ) {
          additionalMods.push({
            label: game.i18n.localize('ITEM.TypePower'),
            value: modifier.signedString(),
          });
        }
      }

      ItemChatCardHelper.handleAction(item, this.actor, action, additionalMods);

      //handle Power Item Card PP adjustment
      if (action === 'pp-adjust') {
        const adjustment = button.getAttribute('data-adjust') as string;
        const power = this.actor.items.get(itemId, { strict: true });
        let key = 'data.powerPoints.value';
        const arcane = getProperty(power.data, 'data.arcane');
        if (arcane) key = `data.powerPoints.${arcane}.value`;
        let newPP = getProperty(this.actor.data, key);
        if (adjustment === 'plus') {
          newPP += parseInt(ppToAdjust, 10);
        } else if (adjustment === 'minus') {
          newPP -= parseInt(ppToAdjust, 10);
        }
        await this.actor.update({ [key]: newPP });
      }

      //handle Arcane Device Item Card PP adjustment
      if (action === 'arcane-device-pp-adjust') {
        const adjustment = button.getAttribute('data-adjust') as string;
        const item = this.actor.items.get(itemId)!;
        const key = 'data.powerPoints.value';
        let newPP = getProperty(item.data, key);
        if (adjustment === 'plus') {
          newPP += parseInt(arcaneDevicePPToAdjust, 10);
        } else if (adjustment === 'minus') {
          newPP -= parseInt(arcaneDevicePPToAdjust, 10);
        }
        await item.update({ [key]: newPP });
      }
    });

    //Additional Stats roll
    html.find('.additional-stats .roll').on('click', async (ev) => {
      const button = ev.currentTarget;
      const stat = button.dataset.stat!;
      const statData = this.actor.data.data.additionalStats[stat]!;
      let modifier = statData.modifier || '';
      if (!!modifier && !modifier.match(/^[+-]/)) {
        modifier = '+' + modifier;
      }
      //return early if there's no data to roll
      if (!statData.value) return;
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

    //Advances
    html.find('.advance-action').on('click', (ev) => {
      if (this.actor.data.type === 'vehicle') return;
      const button = ev.currentTarget;
      const id = $(button).parents('li.advance').data().advanceId;
      switch (button.dataset.action) {
        case 'edit':
          new AdvanceEditor({
            advance: this.actor.data.data.advances.list.get(id, {
              strict: true,
            }),
            actor: this.actor,
          }).render(true);
          break;
        case 'delete':
          this._deleteAdvance(id);
          break;
        case 'toggle-planned':
          this._toggleAdvancePlanned(id);
          break;
        default:
          throw new Error(`Action ${button.dataset.action} not supported`);
      }
    });
  }

  async getData() {
    const data: any = super.getData();
    if (this.actor.data.type === 'vehicle') return data;

    //retrieve the items and sort them by their sort value
    const items = Array.from(this.actor.items.values()).sort(
      (a, b) => a.data.sort - b.data.sort,
    );

    const ammoManagement = game.settings.get('swade', 'ammoManagement');
    for (const item of items as any[]) {
      // Basic template rendering data
      const data = item.data;
      const actions = item.data.data?.actions?.additional ?? {};
      item.actions = [];

      for (const action in actions) {
        item.actions.push({
          key: action,
          type: actions[action].type,
          name: actions[action].name,
        });
      }
      item.hasDamage =
        !!getProperty(data, 'data.damage') ||
        !!item.actions.find((action) => action.type === 'damage');
      item.skill =
        getProperty(data, 'data.actions.skill') ||
        !!item.actions.find((action) => action.type === 'skill');
      item.hasSkillRoll =
        ['weapon', 'power', 'shield'].includes(data.type) &&
        getProperty(data, 'data.actions.skill');
      item.hasAmmoManagement =
        ammoManagement &&
        item.type === 'weapon' &&
        !item.isMeleeWeapon &&
        !data.data.autoReload;
      item.hasReloadButton =
        ammoManagement && data.data.shots > 0 && !data.data.autoReload;

      item.powerPoints = this._getPowerPoints(data);
    }

    const itemTypes: Record<string, SwadeItem[]> = {};
    for (const item of items) {
      const type = item.type;
      if (!itemTypes[type]) itemTypes[type] = [];
      itemTypes[type].push(item);
    }

    data.itemTypes = itemTypes;
    data.effects = await this._getEffects();

    //sort skills alphabetically
    data.sortedSkills = this.actor.itemTypes.skill.sort((a, b) =>
      a.name!.localeCompare(b.name!),
    );

    data.currentBennies = [];
    const bennies = getProperty(
      this.actor.data,
      'data.bennies.value',
    ) as number;
    for (let i = 0; i < bennies; i++) {
      data.currentBennies.push(i + 1);
    }

    const additionalStats: Record<string, AdditionalStat> =
      data.data.data.additionalStats || {};
    for (const attr of Object.values(additionalStats)) {
      attr['isCheckbox'] = attr.dtype === 'Boolean';
    }
    data.hasAdditionalStatsFields = Object.keys(additionalStats).length > 0;

    const powerFilter = (i) => i.data.type === 'power';
    //Deal with ABs and Powers
    const powers = {
      arcanes: {},
      arcanesCount: this.actor.items
        .filter(powerFilter)
        .map((p) => {
          return p.data.data['arcane'];
        })
        .filter(Boolean).length,
      hasPowersWithoutArcane:
        this.actor.items.filter(powerFilter).reduce((acc, cur) => {
          if (cur.data.data['arcane']) {
            return acc;
          } else {
            return (acc += 1);
          }
        }, 0) > 0,
    };

    for (const power of this.actor.items.filter(powerFilter)) {
      if (power.data.type !== 'power') continue;
      const arcane = power.data.data.arcane;
      if (!arcane) continue;
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
    data.parry = 0;
    for (const shield of this.actor.itemTypes.shield) {
      if (shield.data.type !== 'shield') continue;
      if (shield.data.data.equipped) {
        data.parry += shield.data.data.parry;
      }
    }
    // Check for enabled optional rules
    data.settingrules = {
      conviction: game.settings.get('swade', 'enableConviction'),
      noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
      wealthType: game.settings.get('swade', 'wealthType'),
      currencyName: game.settings.get('swade', 'currencyName'),
      weightUnit:
        game.settings.get('swade', 'weightUnit') === 'imperial' ? 'lbs' : 'kg',
    };

    data.advances = {
      expanded: this.actor.data.data.advances.mode === 'expanded',
      list: this._getAdvances(),
    };

    data.archetype = {
      value: this.actor.data.data.details.archetype
        ? new Handlebars.SafeString(
            TextEditor.enrichHTML(this.actor.data.data.details.archetype),
          )
        : game.i18n.localize('SWADE.Archetype'),
      label: 'SWADE.Archetype',
    };

    data.species = {
      value: this.actor.data.data.details.species.name
        ? new Handlebars.SafeString(
            TextEditor.enrichHTML(this.actor.data.data.details.species.name),
          )
        : game.i18n.localize('SWADE.Race'),
      label: 'SWADE.Race',
    };

    //add benny image URI
    data.bennyImageURL = game.settings.get('swade', 'bennyImageSheet');

    // Procoess attribute abbreviation toggle
    data.useAttributeShorts = game.settings.get('swade', 'useAttributeShorts');

    return data;
  }

  private _getAdvances() {
    if (this.actor.data.type === 'vehicle') return [];
    const retVal = new Array<{ rank: string; list: Advance[] }>();
    const advances = this.actor.data.data.advances.list;
    for (const advance of advances) {
      const sort = advance.sort;
      const rankIndex = util.getRankFromAdvance(advance.sort);
      const rank = util.getRankFromAdvanceAsString(sort);
      if (!retVal[rankIndex]) {
        retVal.push({
          rank: rank,
          list: [],
        });
      }
      retVal[rankIndex].list.push(advance);
    }
    return retVal;
  }

  protected _getPowerPoints(item: SwadeItem) {
    if (item.data.type !== 'power') return {};
    const arcane = item.data.data.arcane;
    let current = getProperty(item.actor!, 'data.data.powerPoints.value');
    let max = getProperty(item.actor!, 'data.data.powerPoints.max');
    if (arcane) {
      current = getProperty(
        item.actor!,
        `data.data.powerPoints.${arcane}.value`,
      );
      max = getProperty(item.actor!, `data.data.powerPoints.${arcane}.max`);
    }
    return { current, max };
  }

  /**
   * Extend and override the sheet header buttons
   * @override
   */
  protected _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    // Token Configuration
    const canConfigure = this.actor.isOwner;
    if (this.options.editable && canConfigure) {
      const button = {
        label: game.i18n.localize('SWADE.Tweaks'),
        class: 'configure-actor',
        icon: 'fas fa-dice',
        onclick: (ev) => this._onConfigureEntity(ev),
      };
      buttons = [button, ...buttons];
    }
    return buttons;
  }

  protected _onConfigureEntity(event: Event) {
    event.preventDefault();
    new game.swade.apps.SwadeDocumentTweaks(this.actor).render(true);
  }

  protected _toggleItem(
    doc: SwadeItem | SwadeActiveEffect,
    toggle: string,
  ): Record<string, unknown> {
    const oldVal = !!getProperty(doc.data, toggle);
    return { _id: doc.id, [toggle]: !oldVal };
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
            label: 'OK',
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

  protected async _createActiveEffect(
    name?: string,
    data: ActiveEffectDataConstructorData = {
      label: '',
      icon: '',
      duration: {},
    },
    renderSheet = true,
  ) {
    //Modify the data based on parameters passed in
    if (!name) {
      name = game.i18n.format('DOCUMENT.New', {
        type: game.i18n.localize('DOCUMENT.ActiveEffect'),
      });
    }
    data.label = name;

    // Set default icon if none provided.
    if (!data.icon) {
      data.icon = '/icons/svg/mystery-man-black.svg';
    }

    // Set combat ID if none provided.
    if (!data.duration) {
      data.duration = {
        combat: game.combat?.id,
      };
    }
    return await CONFIG.ActiveEffect.documentClass.create(data, {
      renderSheet: renderSheet,
      parent: this.actor,
    });
  }

  protected async _getEffects() {
    const temporary = new Array<Effect>();
    const permanent = new Array<Effect>();
    for (const effect of this.actor.effects) {
      const val: Effect = {
        id: effect.id!,
        label: effect.data.label,
        icon: effect.data.icon,
        disabled: effect.data.disabled,
        favorite: effect.getFlag('swade', 'favorite'),
      };
      if (effect.data.origin) {
        const origin = await fromUuid(effect.data.origin);
        val.origin = origin?.name;
      }
      if (effect.isTemporary) {
        temporary.push(val);
      } else {
        permanent.push(val);
      }
    }
    return { temporary, permanent };
  }

  protected async _inlineItemCreate(button: HTMLButtonElement) {
    const type = button.dataset.type!;
    // item creation helper func
    const createItem = function (
      type: string,
      name: string = `New ${type.capitalize()}`,
    ): any {
      const itemData = {
        name: name ? name : `New ${type.capitalize()}`,
        type: type,
        data: button.dataset,
      };
      delete itemData.data['type'];
      return itemData;
    };
    switch (type) {
      case 'choice':
        this._chooseItemType().then(async (dialogInput: any) => {
          if (dialogInput.type !== 'effect') {
            const itemData = createItem(dialogInput.type, dialogInput.name);
            await Item.create(itemData, {
              renderSheet: true,
              parent: this.actor,
            });
          } else {
            this._createActiveEffect(dialogInput.name);
          }
        });
        break;
      case 'effect':
        this._createActiveEffect();
        break;
      case 'advance':
        this._addAdvance();
        break;
      default:
        await Item.create(createItem(type), {
          renderSheet: true,
          parent: this.actor,
        });
        break;
    }
  }

  private async _addAdvance() {
    if (this.actor.data.type === 'vehicle') return;
    const advances = this.actor.data.data.advances.list;
    const newAdvance: Advance = {
      id: foundry.utils.randomID(8),
      type: constants.ADVANCE_TYPE.EDGE,
      sort: advances.size + 1,
      planned: false,
      notes: '',
    };
    advances.set(newAdvance.id, newAdvance);
    await this.actor.update({ 'data.advances.list': advances.toJSON() });
    new AdvanceEditor({
      advance: newAdvance,
      actor: this.actor,
    }).render(true);
  }

  private async _deleteAdvance(id: string) {
    if (this.actor.data.type === 'vehicle') return;
    Dialog.confirm({
      title: game.i18n.localize('SWADE.Advances.Delete'),
      content: `<form>
      <div style="text-align: center;">
        <p>Are you sure?</p>
      </div>
    </form>`,
      defaultYes: false,
      yes: () => {
        if (this.actor.data.type === 'vehicle') return;
        const advances = this.actor.data.data.advances.list;
        advances.delete(id);
        const arr = advances.toJSON();
        arr.forEach((a, i) => (a.sort = i + 1));
        this.actor.update({ 'data.advances.list': arr });
      },
    });
  }

  private async _toggleAdvancePlanned(id: string) {
    if (this.actor.data.type === 'vehicle') return;
    Dialog.confirm({
      title: game.i18n.localize('SWADE.Advances.Toggle'),
      content: `<form>
        <div style="text-align: center;">
          <p>Are you sure?</p>
        </div>
      </form>`,
      defaultYes: false,
      yes: () => {
        if (this.actor.data.type === 'vehicle') return;
        const advances = this.actor.data.data.advances.list;
        const advance = advances.get(id, { strict: true });
        advance.planned = !advance.planned;
        advances.set(id, advance);
        this.actor.update(
          { 'data.advances.list': advances.toJSON() },
          { diff: false },
        );
      },
    });
  }

  private _setupCharacterDetailInput(ev: JQuery.ClickEvent) {
    if (this.actor.data.type === 'vehicle') return;
    //gather data
    const display = $(ev.currentTarget).parent().find('span.display');
    const detail = display.data().detail;
    const label = game.i18n.localize(display.data().label);
    const value = getProperty(this.actor.data, detail);
    //create element
    const input = document.createElement('input');
    input.type = 'text';
    input.name = detail;
    input.value = value;
    input.placeholder = label;
    input.addEventListener('focusout', () => {
      this.actor.update({ [detail]: input.value }, { diff: false });
    });
    //set up the new input in the sheet
    display.replaceWith(input);
    //focus the input
    input.focus();
    //remove the button;
    ev.currentTarget.remove();
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

interface Effect {
  id: string;
  icon: string | undefined | null;
  disabled: boolean;
  favorite?: boolean;
  origin?: string | undefined | null;
  label?: string;
}
