import SwadeBaseActorSheet from './SwadeBaseActorSheet';

/**
 * @noInheritDoc
 */
export default class SwadeNPCSheet extends SwadeBaseActorSheet {
  static get defaultOptions() {
    //TODO Revisit once mergeObject is typed correctly
    //@ts-ignore
    return mergeObject(super.defaultOptions, {
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
    });
  }

  get template() {
    // Later you might want to return a different template
    // based on user permissions.
    if (!game.user.isGM && this.actor.limited)
      return 'systems/swade/templates/actors/limited-sheet.html';
    return 'systems/swade/templates/actors/npc-sheet.html';
  }

  _createEditor(target, editorOptions, initialContent) {
    // remove some controls to the editor as the space is lacking
    editorOptions.toolbar = 'styleselect bullist hr table removeFormat save';
    super._createEditor(target, editorOptions, initialContent);
  }

  // Override to set resizable initial size
  async _renderInner(data, options) {
    const html = await super._renderInner(data, options);
    this.form = html[0];

    // Resize resizable classes
    const resizable = (html as JQuery).find('.resizable');
    resizable.each((_, el) => {
      const heightDelta =
        (this.position.height as number) - (this.options.height as number);
      el.style.height = `${heightDelta + parseInt(el.dataset.baseSize)}px`;
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
    if (this.actor.owner) {
      const handler = (ev) => this._onDragStart(ev);
      // Find all items on the character sheet.
      html.find('span.item.skill').each((i, li) => {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', handler, false);
      });
      html.find('li.item.weapon').each((i, li) => {
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

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Update Item via right-click
    html.find('.contextmenu-edit').on('contextmenu', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.getOwnedItem(li.data('itemId'));
      item.sheet.render(true);
    });

    // Delete Item
    html.find('.item-delete').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.gear-card');
      this.actor.deleteOwnedItem(li.data('itemId'));
    });

    // Roll Skill
    html.find('.skill.item a').on('click', (event) => {
      const element = event.currentTarget as Element;
      const item = element.parentElement.dataset.itemId;
      this.actor.rollSkill(item, { event: event });
    });

    // Add new object
    html.find('.item-create').on('click', async (event) => {
      event.preventDefault();
      const header = event.currentTarget;
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

      // Getting back to main logic
      if (type == 'choice') {
        this._chooseItemType().then(async (dialogInput: any) => {
          const itemData = createItem(dialogInput.type, dialogInput.name);
          itemData.data.equipped = true;
          await this.actor.createOwnedItem(itemData, { renderSheet: true });
        });
        return;
      } else {
        const itemData = createItem(type);
        itemData.data.equipped = true;
        await this.actor.createOwnedItem(itemData, { renderSheet: true });
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
  }

  getData() {
    const data: any = super.getData();

    // Everything below here is only needed if user is not limited
    if (this.actor.limited) return data;

    const shields = data.itemsByType['shield'];
    data.parry = 0;
    if (shields) {
      shields.forEach((shield: any) => {
        if (shield.data.equipped) {
          data.parry += shield.data.parry;
        }
      });
    }
    return data;
  }
}
