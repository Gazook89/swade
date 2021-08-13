import { AdditionalStat } from '../../interfaces/additional';
import { SWADE } from '../config';
import SwadeEntityTweaks from '../dialog/entity-tweaks';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';

/**
 * @noInheritDoc
 */
export default class SwadeItemSheet extends ItemSheet {
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      width: 560,
      height: 'auto' as 'auto',
      classes: ['swade', 'sheet', 'item'],
      tabs: [
        {
          navSelector: '.tabs',
          contentSelector: '.sheet-body',
          initial: 'summary',
        },
      ],
      scrollY: ['.actions-list'],
      resizable: true,
    };
  }

  get template() {
    const path = 'systems/swade/templates/items';
    return `${path}/${this.item.type}.html`;
  }

  /**
   * Extend and override the sheet header buttons
   * @override
   */
  protected _getHeaderButtons() {
    const buttons = super._getHeaderButtons();

    // Token Configuration
    const canConfigure = game.user!.isGM || this.item.owner;
    if (this.options.editable && canConfigure) {
      const button: Application.HeaderButton = {
        label: 'Tweaks',
        class: 'configure-actor',
        icon: 'fas fa-dice',
        onclick: (ev) => this._onConfigureEntity(ev),
      };
      return [button, ...super._getHeaderButtons()];
    }
    return buttons;
  }

  protected _onConfigureEntity(event) {
    event.preventDefault();
    new SwadeEntityTweaks(this.item).render(true);
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    if (
      this.item.data.type === 'gear' ||
      this.item.data.type === 'armor' ||
      this.item.data.type === 'shield' ||
      this.item.data.type === 'weapon' ||
      (this.item.type === 'ability' &&
        this.item.data.data['subtype'] === 'race')
    ) {
      this.form!.ondrop = (ev) => this._onDrop(ev);
    }

    // Delete Item from within Sheet. Only really used for Skills, Edges, Hindrances and Powers
    html.find('.item-delete').on('click', () => {
      this.close();
      this.item.delete();
    });
    // Update Item
    html.find('.power-delete').on('click', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const id = li.data('itemId');
      const map = new Map(
        (this.item.getFlag('swade', 'embeddedPowers') as [string, any][]) || [],
      );
      map.delete(id);
      this.item.setFlag('swade', 'embeddedPowers', Array.from(map));
    });

    html.find('.profile-img').on('contextmenu', () => {
      //@ts-ignore
      new ImagePopout(this.item.img!, {
        title: this.item.name!,
        shareable:
          (this.item.isOwned && this.item.actor?.isOwner) ??
          game.user?.isGM ??
          false,
      }).render(true);
    });

    html.find('.action-create').on('click', () => {
      this.item.update(
        {
          _id: this.item.id,
          ['data.actions.additional.' + randomID()]: {
            name: 'New Action',
            type: 'skill',
          },
        },
        {},
      );
    });

    html.find('.action-delete').on('click', (ev) => {
      const key = ev.currentTarget.dataset.actionKey;
      this.item.update(
        {
          _id: this.item.id,
          'data.actions.additional': {
            [`-=${key}`]: null,
          },
        },
        {},
      );
    });

    html.find('.effect-action').on('click', (ev) => {
      const a = ev.currentTarget;
      const effectId = a.closest('li').dataset.effectId;
      const effect = this.item.effects.get(effectId)!;
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

    html.find('.add-effect').on('click', async (ev) => {
      const transfer = $(ev.currentTarget).data('transfer');
      const newEffect = await ActiveEffect.create(
        {
          label: game.i18n
            .localize('ENTITY.New')
            .replace('{entity}', game.i18n.localize('Active Effect')),
          icon: '/icons/svg/mystery-man.svg',
          transfer: transfer,
        },
        { parent: this.item },
      );
      newEffect?.sheet.render(true);
    });

    html.find('.delete-embedded').on('click', (ev) => {
      ev.preventDefault();
      const id = ev.currentTarget.dataset.id;
      const map = new Map(
        (this.item.getFlag('swade', 'embeddedAbilities') as [string, any][]) ||
          [],
      );
      map.delete(id);
      this.item.setFlag('swade', 'embeddedAbilities', Array.from(map));
    });

    html.find('.additional-stats .roll').on('click', (ev) => {
      const button = ev.currentTarget;
      const stat = button.dataset.stat;
      const statData = this.item.data.data.additionalStats[stat]!;
      let modifier = statData.modifier || '';
      if (!modifier.match(/^[+-]/)) {
        modifier = '+' + modifier;
      }
      //return of there's no value to roll
      if (!statData.value) return;
      new Roll(`1d${statData.value}${modifier}`)
        .evaluate({ async: false })
        .toMessage({
          speaker: ChatMessage.getSpeaker(),
          flavor: `${this.item.name} - ${statData.label}`,
        });
    });
  }

  /**
   * Prepare item sheet data
   * Start with the base item data and extending with additional properties for rendering.
   */
  getData() {
    const data: any = super.getData();
    data.data.isOwned = this.item.isOwned;
    data.config = SWADE;
    const actor = this.item.actor as SwadeActor;
    const ownerIsWildcard = actor && actor.isWildcard;
    if (ownerIsWildcard || !this.item.isOwned) {
      data.data.ownerIsWildcard = true;
    }
    const additionalStats: Record<string, AdditionalStat> =
      data.data.data.additionalStats || {};
    for (const attr of Object.values(additionalStats)) {
      attr['isCheckbox'] = attr['dtype'] === 'Boolean';
    }
    data.hasAdditionalStatsFields = Object.keys(additionalStats).length > 0;
    data.displayNav = !['skill', 'ability'].includes(this.item.type);

    // Check for enabled optional rules
    data['settingrules'] = {
      modSlots: game.settings.get('swade', 'vehicleMods'),
    };

    switch (this.item.type) {
      case 'weapon':
        data['isWeapon'] = true;
        if (this.item.isOwned) {
          data['ammoList'] = this.actor!.itemTypes['gear'].map(
            (i) => i.data.name,
          );
        }
        break;
      default:
        break;
    }
    return data;
  }

  // Override to set resizable initial size
  async _renderInner(data) {
    const html = await super._renderInner(data);
    this.form = html[0];

    // Resize resizable classes
    const resizable = (html as JQuery).find('.resizable');
    resizable.each((_, el) => {
      const heightDelta =
        (this.position.height as number) - (this.options.height as number);
      el.style.height = `${heightDelta + parseInt(el.dataset.baseSize!)}px`;
    });

    // Filter power list
    const arcane = !this.options['activeArcane']
      ? 'All'
      : this.options['activeArcane'];
    (html as JQuery).find('.arcane-tabs .arcane').removeClass('active');
    (html as JQuery).find(`[data-arcane='${arcane}']`).addClass('active');
    this._filterPowers(html as JQuery, arcane);

    return html;
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

  async _onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    let data;
    let item: SwadeItem;

    //get the data and accept it
    try {
      //get the data
      data = JSON.parse(event.dataTransfer!.getData('text/plain'));

      if ('pack' in data) {
        const pack = game.packs?.get(data.pack);
        item = (await pack?.getDocument(data.id)) as SwadeItem;
      } else if ('actorId' in data) {
        item = new SwadeItem(data.data);
      } else {
        item = game.items?.get(data.id)!;
      }

      if (
        data.type !== 'Item' ||
        (item.data.type === 'ability' && item.data.data.subtype === 'race')
      ) {
        console.log('SWADE | You cannot add a race to a race');
        return false;
      }
    } catch (error) {
      console.error(error);
      return false;
    }

    //prep item data

    const itemData = deepClone(item.data.toObject());
    //@ts-ignore
    delete itemData['_id'];
    //@ts-ignore
    delete itemData['permission'];

    let propertyName = '';
    if (
      this.item.data.type === 'ability' &&
      this.item.data.data.subtype === 'race'
    ) {
      propertyName = 'embeddedAbilities';
    }

    if (
      (
        this.item.data.type === 'gear' ||
        this.item.data.type === 'armor' ||
        this.item.data.type === 'shield' ||
        this.item.data.type === 'weapon'
      ) &&
      item.data.type === 'power'
    ) {
      propertyName = 'embeddedPowers'
    }
    //pull the array from the flags, and push the new entry into it
    const collection =
      (this.item.getFlag('swade', propertyName) as [string, any][]) || [];
    collection.push([randomID(), itemData]);
    //save array back into flag
    await this.item.setFlag('swade', propertyName, collection);
    return false;
  }
}
