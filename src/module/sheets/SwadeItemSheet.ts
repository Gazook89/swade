import { SWADE } from '../config';
import SwadeEntityTweaks from '../dialog/entity-tweaks';
import SwadeItem from '../entities/SwadeItem';
import { AbilitySubtype } from '../enums/AbilitySubtypeEnum';
import { ItemType } from '../enums/ItemTypeEnum';

/**
 * @noInheritDoc
 */
export default class SwadeItemSheet extends ItemSheet {
  get item(): SwadeItem {
    return super.item as SwadeItem;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      width: 560,
      height: 'auto',
      classes: ['swade', 'sheet', 'item'],
      tabs: [
        {
          navSelector: '.tabs',
          contentSelector: '.sheet-body',
          initial: 'summary',
        },
      ],
      resizable: true,
    });
  }

  /**
   * Return a dynamic reference to the HTML template path used to render this Item Sheet
   * @return {string}
   */
  get template() {
    const path = 'systems/swade/templates/items';
    return `${path}/${this.item.data.type}.html`;
  }

  /**
   * Extend and override the sheet header buttons
   * @override
   */
  protected _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    // Token Configuration
    const canConfigure = game.user.isGM || this.item.owner;
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
    new SwadeEntityTweaks(this.item as SwadeItem, {
      top: this.position.top + 40,
      left: this.position.left + ((this.position.height as number) - 400) / 2,
    }).render(true);
  }

  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;
    if (
      this.item.type === ItemType.Ability &&
      this.item.data.data.subtype === AbilitySubtype.Race
    ) {
      this.form.ondrop = (ev) => this._onDrop(ev);
    }

    // Delete Item from within Sheet. Only really used for Skills, Edges, Hindrances and Powers
    html.find('.item-delete').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const itemId = li.data('itemId');
      this.close();
      this.item.actor.deleteOwnedItem(itemId);
    });

    html.find('.profile-img').on('contextmenu', () => {
      new ImagePopout(this.item.img, {
        title: this.item.name,
        shareable: true,
        entity: { type: 'Item', id: this.item.id },
      }).render(true);
    });

    html.find('.action-create').on('click', () => {
      this.item.update(
        {
          _id: this.item._id,
          ['data.actions.additional.'.concat(randomID())]: {
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
          _id: this.item._id,
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
      const effect = this.item['effects'].get(effectId) as any;
      const action = a.dataset.action;
      if (this.item.isOwned) {
        //FIXME once this is supported in Foundry
        ui.notifications.info(
          'Active Effects on owned Items are currently not supported',
        );
      } else {
        switch (action) {
          case 'edit':
            return effect.sheet.render(true);
          case 'delete':
            return effect.delete();
          case 'toggle':
            return effect.update({ disabled: !effect.data.disabled });
        }
      }
    });

    html.find('.add-effect').on('click', async (ev) => {
      if (this.item.isOwned) {
        //FIXME once this is supported in Foundry
        ui.notifications.info(
          'Active Effects on owned Items are currently not supported',
        );
      } else {
        const transfer = $(ev.currentTarget).data('transfer');
        const id = (
          await this.item.createEmbeddedEntity('ActiveEffect', {
            label: game.i18n
              .localize('ENTITY.New')
              .replace('{entity}', game.i18n.localize('Active Effect')),
            icon: '/icons/svg/mystery-man.svg',
            transfer: transfer,
          })
        )._id;
        return new ActiveEffectConfig(this.item['effects'].get(id)).render(
          true,
        );
      }
    });

    html.find('.delete-embedded').on('click', (ev) => {
      ev.preventDefault();
      const id = ev.currentTarget.dataset.id;
      const map = new Map(
        this.item.getFlag('swade', 'embeddedAbilities') || [],
      );
      map.delete(id);
      this.item.setFlag('swade', 'embeddedAbilities', Array.from(map));
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
    const actor = this.item.actor;
    const ownerIsWildcard = actor && actor.isWildcard;
    if (ownerIsWildcard || !this.item.isOwned) {
      data.data.ownerIsWildcard = true;
    }
    const additionalStats = data.data.additionalStats || {};
    for (const attr of Object.values(additionalStats)) {
      attr['isCheckbox'] = attr['dtype'] === 'Boolean';
    }
    data.hasAdditionalStatsFields = Object.keys(additionalStats).length > 0;
    data.displayNav = ![
      ItemType.Skill.toString(),
      ItemType.Ability.toString(),
    ].includes(this.item.type);

    // Check for enabled optional rules
    data['settingrules'] = {
      modSlots: game.settings.get('swade', 'vehicleMods'),
    };

    switch (this.item.type) {
      case 'weapon':
        data['isWeapon'] = true && game.settings.get('swade', 'ammoManagement');
        break;
      default:
        break;
    }
    return data;
  }

  /**
   * @override
   */
  async _onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    let data;
    let item: SwadeItem;

    //get the data and accept it
    try {
      //get the data
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
      console.log(data);
      if ('pack' in data) {
        const pack = game.packs.get(data.pack) as Compendium;
        item = (await pack.getEntity(data.id)) as SwadeItem;
      } else if ('actorId' in data) {
        item = new SwadeItem(data.data, {});
      } else {
        item = game.items.get(data.id) as SwadeItem;
      }

      const itemIsRightType = ![
        ItemType.Ability.toString(),
        ItemType.Hindrance.toString(),
        ItemType.Edge.toString(),
        ItemType.Skill.toString(),
      ].includes(item.type);

      if (
        data.type !== 'Item' ||
        itemIsRightType ||
        (item.type === ItemType.Ability &&
          item.data.data.subtype === AbilitySubtype.Race)
      ) {
        console.log(
          'SWADE | Races only accept abilities, hindrances, edges and skills',
        );
        return false;
      }
    } catch (error) {
      console.error(error);
      return false;
    }
    //prep item data
    const itemData = item.data;
    delete itemData['_id'];
    delete itemData['permission'];

    //pull the array from the flags, and push the new entry into it
    const collection = this.item.getFlag('swade', 'embeddedAbilities') || [];
    collection.push([randomID(), item.data]);
    //save array back into flag
    await this.item.setFlag('swade', 'embeddedAbilities', collection);
    return false;
  }
}
