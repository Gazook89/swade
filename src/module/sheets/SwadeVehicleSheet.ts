import IDriverData from '../../interfaces/IDriverData';
import { SWADE } from '../config';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import SwadeBaseActorSheet from './SwadeBaseActorSheet';

/**
 * @noInheritDoc
 */
export default class SwadeVehicleSheet extends SwadeBaseActorSheet {
  /**
   * Extend and override the default options used by the Actor Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['swade', 'sheet', 'actor', 'vehicle'],
      width: 600,
      height: 540,
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
    return 'systems/swade/templates/actors/vehicle-sheet.html';
  }

  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Drag events for macros.
    if (this.actor.isOwner) {
      const handler = (ev: DragEvent) => this._onDragStart(ev);
      // Find all items on the character sheet.
      html.find('li.item.weapon').each((i, li) => {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', handler, false);
      });
    }

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

    // Delete Item
    html.find('.item-delete').on('click', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const ownedItem = this.actor.items.get(li.data('itemId'));
      const template = `
          <form>
            <div>
              <center>${game.i18n.localize('SWADE.Del')} 
                <strong>${ownedItem?.name}</strong>?
              </center>
              <br>
            </div>
          </form>`;
      await Dialog.confirm({
        title: game.i18n.localize('SWADE.Del'),
        content: template,
        render: () => {},
        yes: async () => {
          await ownedItem?.delete();
          li.slideUp(200, () => this.render(false));
        },
        no: () => {},
      });
    });

    // Add new object
    html.find('.item-create').on('click', async (event) => {
      event.preventDefault();
      const header = event.currentTarget;
      const type = header.dataset.type ?? '';

      let modData;
      let weaponData;

      switch (type) {
        case 'choice':
          this._chooseItemType().then(async (dialogInput: any) => {
            const itemData = this._createItemData(
              dialogInput.type,
              header,
              dialogInput.name,
            );
            await this.actor.createOwnedItem(itemData, { renderSheet: true });
          });
          break;
        case 'mod':
          modData = this._createItemData('gear', header);
          modData.data.isVehicular = true;
          modData.data.equipped = true;
          modData.name = `New ${type.capitalize()}`;
          await this.actor.createOwnedItem(modData, { renderSheet: true });
          break;
        case 'vehicle-weapon':
          weaponData = this._createItemData('weapon', header);
          weaponData.data.isVehicular = true;
          weaponData.data.equipped = true;
          await this.actor.createOwnedItem(weaponData, { renderSheet: true });
          break;
        default:
          await this.actor.createOwnedItem(this._createItemData(type, header), {
            renderSheet: true,
          });
          break;
      }
    });

    //Reset the Driver
    html.find('.reset-driver').on('click', async () => {
      await this._resetDriver();
    });

    // Open driver sheet
    html.find('.driver-img').on('click', async () => {
      await this._openDriverSheet();
    });

    //Maneuver Check
    html
      .find('#maneuverCheck')
      .on('click', (event) => this.actor.rollManeuverCheck(event));
  }

  /**
   * @override
   */
  async getData() {
    const data = super.getData();

    data.config = SWADE;
    data.itemsByType = {};
    data.opSkills = this._buildOpSkillList();
    for (const item of data.items) {
      let list = data.itemsByType[item.type];
      if (!list) {
        list = [];
        data.itemsByType[item.type] = list;
      }
      list.push(item);
    }

    //Prepare inventory
    data.inventory = this._determineCargo().sort(
      (a, b) => a!.name!.localeCompare(b.name!) ?? 0,
    );

    data.inventoryWeight = 0;
    data.inventory.forEach((i: SwadeItem) => {
      //@ts-ignore
      data.inventoryWeight += i.data.data.weight * i.data.data.quantity;
    });

    //Fetch Driver data
    data.driver = await this._fetchDriver();

    // Check for enabled optional rules
    data.settingrules = {
      vehicleEdges: game.settings.get('swade', 'vehicleEdges'),
      modSlots: game.settings.get('swade', 'vehicleMods'),
    };

    if (data.settingrules.modSlots) {
      const modsUsed = this._calcModSlotsUsed();
      data.mods = {
        used: modsUsed,
        percentage: this._calcModsPercentage(modsUsed),
      };
    }
    return data;
  }

  /**
   * Determines the cargo inventory of the vehicle, sorting out all the non-vehicular items
   * @param itemsByType an object with the items filtered by type
   */
  private _determineCargo() {
    return [
      ...this.actor.itemTypes.gear.filter(
        (i) =>
          i.data.type === 'gear' &&
          (!i.data.data.isVehicular || !i.data.data.equipped),
      ),
      ...this.actor.itemTypes.weapon.filter(
        (i) =>
          i.data.type === 'gear' &&
          (!i.data.data.isVehicular || !i.data.data.equipped),
      ),
      ...this.actor.itemTypes.armor,
      ...this.actor.itemTypes.armor,
    ];
  }

  async setDriver(id: string): Promise<void> {
    const driver = game.actors?.get(id);
    if (driver && driver.data.type !== 'vehicle') {
      await this.actor.update({ 'data.driver.id': id });
    }
  }

  private async _fetchDriver() {
    if (this.actor.data.type !== 'vehicle') return null;

    const driverId = this.actor.data.data.driver.id;
    const driver = await this.actor.getDriver();
    const userCanViewDriver =
      game.user?.isGM ||
      (driver && driver.permission >= CONST.ENTITY_PERMISSIONS.LIMITED);
    const driverData: IDriverData = {
      img: 'icons/svg/mystery-man-black.svg',
      name: 'No Driver',
      userCanSeeDriver: userCanViewDriver!,
    };

    //Return if the vehicle has no driver
    if (!driverId || !driver) {
      return driverData;
    }

    //Display the Driver data if the current user has at least Limited permission on the driver Actor
    if (userCanViewDriver) {
      driverData.img = driver.img!;
      driverData.name = driver.name!;
    } else {
      //else just show an aunknown driver
      driverData.name = 'Unkown Driver';
    }
    return driverData;
  }

  private async _resetDriver() {
    await this.actor.update({ 'data.driver.id': null });
  }

  private async _openDriverSheet() {
    const driverId = getProperty(this.actor.data, 'data.driver.id');
    const driver = (await fromUuid(driverId)) as SwadeActor;
    if (driver) {
      driver.sheet?.render(true);
    }
  }

  // item creation helper func
  private _createItemData(
    type: string,
    header: HTMLElement,
    name?: string,
  ): any {
    const itemData = {
      name: name ? name : `New ${type.capitalize()}`,
      type: type,
      img: `systems/swade/assets/icons/${type}.svg`,
      data: deepClone(header.dataset),
    };
    delete itemData.data['type'];
    return itemData;
  }

  /**
   * calculate how many modslots are used
   */
  private _calcModSlotsUsed(): number {
    const mods = this.actor.items.filter(
      (i: SwadeItem) =>
        i.data.type === 'gear' &&
        i.data.data.isVehicular &&
        i.data.data.equipped,
    );
    let retVal = 0;
    mods.forEach((m) => (retVal += getProperty(m.data, 'data.mods') as number));
    return retVal;
  }

  /**
   * calculate how many percent of modslots are used
   * @param modsUsed number of active modslots
   */
  private _calcModsPercentage(modsUsed: number): number | undefined {
    if (this.actor.data.type !== 'vehicle') return;
    const maxMods = this.actor.data.data.maxMods;
    let p = (modsUsed / maxMods) * 100;

    //cap the percentage at 100
    if (p > 100) {
      p = 100;
    }
    return p;
  }

  private _buildOpSkillList() {
    const opSkills = SWADE.vehicles.opSkills;
    return opSkills.reduce((acc: Record<string, string>, cur: string) => {
      acc[cur] = cur;
      return acc;
    }, {});
  }
}
