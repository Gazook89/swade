import { ActiveEffectDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/activeEffectData';
import { StatusEffect } from '../../globals';
import { SWADE } from '../config';
import SwadeBaseActorSheet from './SwadeBaseActorSheet';

/**
 * @noInheritDoc
 */
export default class SwadeNPCSheet extends SwadeBaseActorSheet {
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      classes: ['swade', 'sheet', 'actor', 'npc'],
      width: 660,
      height: 600,
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
    // Later you might want to return a different template
    // based on user permissions.
    if (!game.user?.isGM && this.actor.limited)
      return 'systems/swade/templates/actors/limited-sheet.hbs';
    return 'systems/swade/templates/actors/npc-sheet.hbs';
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

  activateListeners(html: JQuery): void {
    super.activateListeners(html);

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
    }

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Update Item via right-click
    html.find('.contextmenu-edit').on('contextmenu', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'))!;
      item.sheet?.render(true);
    });

    // Delete Item
    html.find('.item-delete').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.gear-card');
      this.actor.items.get(li.data('itemId'))?.delete();
    });

    // Roll Skill
    html.find('.skill.item a').on('click', (event) => {
      const element = event.currentTarget as Element;
      const item = element.parentElement!.dataset.itemId as string;
      this.actor.rollSkill(item);
    });

    // Add new object
    html.find('.item-create').on('click', async (event) => {
      event.preventDefault();
      const header = event.currentTarget;
      const type = header.dataset.type!;

      // item creation helper func
      const createItem = function (
        type: string,
        name: string = `New ${type.capitalize()}`,
      ): any {
        const itemData = {
          name: name ? name : `New ${type.capitalize()}`,
          type: type,
          data: deepClone(header.dataset),
        };
        delete itemData.data['type'];
        return itemData;
      };

      // Getting back to main logic
      if (type == 'choice') {
        const dialogInput = await this._chooseItemType();
        const itemData = createItem(dialogInput.type, dialogInput.name);
        itemData.data.equipped = true;
        await Item.create(itemData, { renderSheet: true, parent: this.actor });
        return;
      } else {
        const itemData = createItem(type);
        itemData.data.equipped = true;
        await Item.create(itemData, { renderSheet: true, parent: this.actor });
      }
    });

    //Toggle Equipmnent Card collapsible
    html.find('.gear-card .card-header .item-name').on('click', (ev) => {
      const card = $(ev.currentTarget).parents('.gear-card');
      const content = card.find('.card-content');
      content.toggleClass('collapsed');
      if (content.hasClass('collapsed')) {
        content.slideUp();
      } else {
        content.slideDown();
      }
    });

    // Active Effects
    html
      .find('.status-container input[type="checkbox"]')
      .on('change', async (event) => {
        // Get the key from the target name
        const id = event.target.dataset.id as string;
        const key = event.target.dataset.key as string;
        const statusConfigData = SWADE.statusEffects.find(
          (effect) => effect.id === id,
        ) as StatusEffect;
        // this is just to make sure the status is false in the source data
        await this.actor.update({
          'data.status': {
            [key]: false,
          },
        });
        this.actor.toggleActiveEffect(statusConfigData);
      });
  }

  getData() {
    const data: any = super.getData();

    // Progress attribute abbreviation toggle
    data.useAttributeShorts = game.settings.get('swade', 'useAttributeShorts');

    // Everything below here is only needed if user is not limited
    if (this.actor.limited) return data;

    const shields = data.itemsByType['shield'];
    data.parry = 0;
    shields.forEach((shield) => {
      if (shield.data.equipped) {
        data.parry += shield.data.parry;
      }
    });
    return data;
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
      parent: this.actor,
    });
  }
}
