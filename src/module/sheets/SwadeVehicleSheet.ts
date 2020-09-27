import IDriverData from '../../interfaces/IDriverData';
import SwadeActor from '../entities/SwadeActor';
// eslint-disable-next-line no-unused-vars
import SwadeItem from '../entities/SwadeItem';
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
    if (this.actor.owner) {
      let handler = (ev) => this._onDragItemStart(ev);
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
      const ownedItem = this.actor.getOwnedItem(li.data('itemId'));
      const template = `
          <form>
            <div>
              <center>${game.i18n.localize('SWADE.Del')} 
                <strong>${ownedItem.name}</strong>?
              </center>
              <br>
            </div>
          </form>`;
      await Dialog.confirm({
        title: game.i18n.localize('SWADE.Del'),
        content: template,
        yes: async () => {
          await this.actor.deleteOwnedItem(ownedItem.id);
          li.slideUp(200, () => this.render(false));
        },
        no: () => {},
      });
    });

    // Add new object
    html.find('.item-create').on('click', async (event) => {
      event.preventDefault();
      const header = event.currentTarget;
      let type = header.dataset.type;

      let modData;
      let weaponData;
      let createdItem: Item;

      switch (type) {
        case 'choice':
          this._chooseItemType().then(async (dialogInput: any) => {
            const itemData = this._createItemData(
              dialogInput.type,
              header,
              dialogInput.name,
            );
            createdItem = await this.actor.createOwnedItem(itemData, {});
          });
          break;
        case 'mod':
          modData = this._createItemData('gear', header);
          modData.data.isVehicular = true;
          modData.data.equipped = true;
          modData.name = `New ${type.capitalize()}`;
          createdItem = await this.actor.createOwnedItem(modData, {});
          break;
        case 'vehicle-weapon':
          weaponData = this._createItemData('weapon', header);
          weaponData.data.isVehicular = true;
          weaponData.data.equipped = true;
          createdItem = await this.actor.createOwnedItem(weaponData, {});
          break;
        default:
          createdItem = await this.actor.createOwnedItem(
            this._createItemData(type, header),
            {},
          );
          break;
      }
      this.actor.getOwnedItem(createdItem._id).sheet.render(true);
    });

    //Reset the Driver
    html.find('.reset-driver').on('click', async () => {
      await this._resetDriver();
    });

    // Open driver sheet
    html.find('.driver-img').on('click', async () => {
      await this._openDriverSheet();
    });

    //Input Synchronization
    html.find('.wound-input').on('keyup', (ev) => {
      this.actor.update({ 'data.wounds.value': $(ev.currentTarget).val() });
    });

    //Maneuver Check
    html
      .find('#maneuverCheck')
      .on('click', (event) => this.actor.rollManeuverCheck(event));
  }

  getData(): ActorSheetData {
    let data: any = super.getData();

    data.config = CONFIG.SWADE;
    data.itemsByType = {};
    for (const item of data.items) {
      let list = data.itemsByType[item.type];
      if (!list) {
        list = [];
        data.itemsByType[item.type] = list;
      }
      list.push(item);
    }

    //Prepare inventory
    data.inventory = this._determineCargo(data.itemsByType).sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });

    data.inventoryWeight = 0;
    data.inventory.forEach((i: SwadeItem) => {
      data.inventoryWeight += i.data['weight'] * i.data['quantity'];
    });

    //Fetch Driver data
    data.driver = this._fetchDriver();

    // Check for enabled optional rules
    data.settingrules = {
      vehicleEdges: game.settings.get('swade', 'vehicleEdges'),
      modSlots: game.settings.get('swade', 'vehicleMods'),
    };

    if (data.settingrules.modSlots) {
      let modsUsed = this._calcModSlotsUsed();
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
  private _determineCargo(itemsByType) {
    return [
      ...this._checkNull(itemsByType['gear']).filter(
        (i) => !i.data['isVehicular'] || !i.data['equipped'],
      ),
      ...this._checkNull(itemsByType['weapon']).filter(
        (i) => !i.data['isVehicular'] || !i.data['equipped'],
      ),
      ...this._checkNull(itemsByType['armor']),
      ...this._checkNull(itemsByType['shield']),
    ];
  }

  async setDriver(id: string): Promise<void> {
    let driver = game.actors.get(id);
    if (driver && driver.data.type !== 'vehicle') {
      await this.actor.update({ 'data.driver.id': id });
    }
  }

  private _fetchDriver() {
    let driverId = getProperty(this.actor.data, 'data.driver.id');
    let driver = game.actors.get(driverId) as SwadeActor;
    let userCanViewDriver =
      game.user.isGM || driver.permission >= CONST.ENTITY_PERMISSIONS.LIMITED;
    let driverData: IDriverData = {
      img: 'icons/svg/mystery-man.svg',
      name: 'No Driver',
      userCanSeeDriver: userCanViewDriver,
    };

    //Return if the vehicle has no driver
    if (!driverId || !driver) {
      return driverData;
    }

    //Display the Driver data if the current user has at least Limited permission on the driver Actor
    if (userCanViewDriver) {
      driverData.img = driver.img;
      driverData.name = driver.name;
    } else {
      //else just show an aunknown driver
      driverData.name = 'Unkown Driver';
    }
    return driverData;
  }

  private async _resetDriver() {
    await this.actor.update({ 'data.driver.id': '' });
  }

  private _openDriverSheet() {
    let driverId = getProperty(this.actor.data, 'data.driver.id');
    let driver = game.actors.get(driverId);
    if (driver) {
      driver.sheet.render(true);
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
      data: duplicate(header.dataset),
    };
    delete itemData.data['type'];
    return itemData;
  }

  /**
   * calculate how many modslots are used
   */
  private _calcModSlotsUsed(): number {
    let mods = this.actor.items.filter(
      (i: SwadeItem) =>
        i.type === 'gear' &&
        i.data.data['isVehicular'] &&
        i.data.data['equipped'],
    );
    let retVal = 0;
    mods.forEach((m: SwadeItem) => (retVal += m.data.data['mods']));

    return retVal;
  }

  /**
   * calculate how many percent of modslots are used
   * @param modsUsed number of active modslots
   */
  private _calcModsPercentage(modsUsed: number): number {
    let maxMods = this.actor.data.data['maxMods'];
    let p = (modsUsed / maxMods) * 100;

    //cap the percentage at 100
    if (p > 100) {
      p = 100;
    }
    return p;
  }
}
