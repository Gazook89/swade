import {
  AdditionalStat,
  ItemAction,
  TraitRollModifier,
} from '../../../interfaces/additional';
import { SWADE } from '../../config';
import SwadeItem from '../../documents/item/SwadeItem';
import ItemChatCardHelper from '../../ItemChatCardHelper';

export default class CharacterSheet extends ActorSheet {
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
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
    };
  }

  get template() {
    return 'systems/swade/templates/official/sheet.hbs';
  }

  activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

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
      html.find('.status input[type="checkbox"]').on('change', async (event) => {
        // Get the key from the target name
        //@ts-ignore because it's too dumb to know that html elements have a name property
        const key = event.target.name;
        // Get the specific status property
        const statusDataPath = key.split('.')[2];
        // Get the current status value
        let statusValue = this.object.data.data.status[statusDataPath];
        console.log(statusValue)

        // If the status is checked and the status value is false...
        //@ts-ignore because it's too dumb to know that html input elements have a checked property
        if (event.target.checked && statusValue === false) {
          // Check to see if the effect already exists...
          let effectExists = this.object.data.effects.some((effect) => effect.changes.some((change) => change.key === key));
          // If it does exist...
          if (effectExists) {
            // ...find it...
            for (const effect of this.object.data.effects) {
              for (const change of effect.changes) {
                if (change.key === key) {
                  // ...and set disabled to false (thus enabling it)
                  await effect.update({ disabled: false });
                }
              }
            }
            // Otherwise create it
          } else {
            let turns = 1; // default turns value of 1

            // Get the label from the inner text of the parent label element
            //@ts-ignore because it's too dumb to know that html elements have a parentNode property
            const statusLabel = event.target.parentNode?.innerText;
            // Lookup the status effect in CONFIG.
            const configStatusEffect = CONFIG.statusEffects.find((s) => s.id === statusLabel.toLowerCase())
            // Set duration and combat ID
            const endOfNextTurnStatuses = ['Distracted', 'Vulnerable']
            const duration = {
              combat: game.combat?.id
            } as any;

            if (endOfNextTurnStatuses.includes(statusLabel)) {
              duration.turns = 1;
            };
            // Set up data for AE
            const data = {
              label: statusLabel,
              icon: configStatusEffect?.icon,
              duration: duration,
              changes: [
                {
                  key: key,
                  mode: 5,
                  value: true,
                },
              ],
              flags: {
                swade: {
                  effectType: 'status',
                },
              },
            } as any;
            // Set render AE sheet to false
            const renderSheet = false;
            // Create the AE
            this._createActiveEffect(statusLabel, data, renderSheet);
          }
          // If the target is not checked or if the status is not set to false...
        } else {
          for (const effect of this.object.data.effects) {
            for (const change of effect.changes) {
              if (change.key === key) {
                // Disable it
                await effect.update({ disabled: true });
                // Update the actor
                await this.actor.update({
                  data: {
                    status: {
                      [statusDataPath]: false,
                    },
                  },
                });
              }
            }
          }
        }
      });
    }

    //Display Advances on About tab
    html.find('label.advances').on('click', async () => {
      this._tabs[0].activate('description');
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
        .attribute! as keyof typeof SWADE.attributes;
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
      const header = ev.currentTarget;
      const type = header.dataset.type!;

      // item creation helper func
      const createItem = function (
        type: string,
        name: string = `New ${type.capitalize()}`,
      ): any {
        const itemData = {
          name: name ? name : `New ${type.capitalize()}`,
          type: type,
          data: header.dataset,
        };
        delete itemData.data['type'];
        return itemData;
      };
      switch (type) {
        case 'choice':
          this._chooseItemType().then(async (dialogInput: any) => {
            if (dialogInput.type !== 'effect') {
              const itemData = createItem(dialogInput.type, dialogInput.name);
              const ae = await Item.create(itemData, {
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
        default:
          await Item.create(createItem(type), {
            renderSheet: true,
            parent: this.actor,
          });
          break;
      }
    });

    //Toggle Equipment Status
    html.find('.item-toggle').on('click', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const itemID = li.data('itemId');
      const item = this.actor.items.get(itemID);
      await this.actor.updateEmbeddedDocuments('Item', [
        this._toggleEquipped(itemID, item),
      ]);
    });

    html.find('.effect-action').on('click', async (ev) => {
      const a = ev.currentTarget;
      const effectId = a.closest('li')!.dataset.effectId!;
      const effect = this.actor.effects.get(effectId)!;
      const action = a.dataset.action;
      let item: SwadeItem | null = null;

      switch (action) {
        case 'edit':
          return effect.sheet.render(true);
        case 'delete':
          return effect.delete();
        case 'toggle':
          return effect.update({ disabled: !effect.data.disabled });
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
    html.find('.currency .roll').on('click', () => {
      if (this.actor.data.type === 'vehicle') return;
      const die = this.actor.data.data.details.wealth.die ?? 6;
      const mod = this.actor.data.data.details.wealth.modifier ?? 0;
      const wildDie = this.actor.data.data.details.wealth['wild-die'] ?? 6;
      const dieLabel = game.i18n.localize('SWADE.WealthDie');
      const wildDieLabel = game.i18n.localize('SWADE.WildDie');
      const formula = `{1d${die}x[${dieLabel}], 1d${wildDie}x[${wildDieLabel}]}kh`;

      game.swade.RollDialog.asPromise({
        roll: new Roll(formula),
        mods: [{ label: 'Modifier', value: mod }],
        speaker: ChatMessage.getSpeaker(),
        actor: this.actor,
        flavor: game.i18n.localize('SWADE.WealthDie'),
        title: game.i18n.localize('SWADE.WealthDie'),
      });
    });
  }

  getData() {
    const data: any = super.getData();

    data.bennyImageURL = game.settings.get('swade', 'bennyImageSheet');

    const ammoManagement = game.settings.get('swade', 'ammoManagement');
    for (const item of Array.from(this.actor.items.values()) as any[]) {
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

      item.powerPoints = this.getPowerPoints(data);
    }

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
    };

    // Progress attribute abbreviation toggle
    data.useAttributeShorts = game.settings.get('swade', 'useAttributeShorts');

    //weight unit
    data.weightUnit = 'lbs';
    if (game.settings.get('swade', 'weightUnit') === 'metric') {
      data.weightUnit = 'kg';
    }

    return data;
  }

  getPowerPoints(item: SwadeItem) {
    if (item.data.type !== 'power') return {};
    const arcane = item.data.data.arcane;
    let current = getProperty(item.actor!, 'data.data.data.powerPoints.value');
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
    new game.swade.SwadeEntityTweaks(this.actor).render(true);
  }

  protected _toggleEquipped(id: string, item: any): any {
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

  protected async _createActiveEffect(name?: string, data = { label: '', icon: '', duration: {} }, renderSheet = true) {
    let possibleName = game.i18n.format('DOCUMENT.New', {
      type: game.i18n.localize('DOCUMENT.ActiveEffect'),
    });

    //Modify the data based on parameters passed in
    if (name) possibleName = name;
    data.label = possibleName;

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

    await CONFIG.ActiveEffect.documentClass.create(data, {
      renderSheet: renderSheet,
      parent: this.actor
    });
  }
}
