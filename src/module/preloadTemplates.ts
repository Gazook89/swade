export const preloadHandlebarsTemplates = async function () {
  const templatePaths = [
    //Character Sheets
    'systems/swade/templates/actors/npc-sheet.html',
    'systems/swade/templates/actors/vehicle-sheet.html',

    //NPC partials
    'systems/swade/templates/actors/partials/attributes.html',
    'systems/swade/templates/actors/partials/npc-summary-tab.html',
    'systems/swade/templates/actors/partials/powers-tab.html',
    'systems/swade/templates/setting-fields.html',
    'systems/swade/templates/shared-partials/action-card.html',

    //Vehicle Partials
    'systems/swade/templates/actors/vehicle-partials/summary-tab.html',
    'systems/swade/templates/actors/vehicle-partials/cargo-tab.html',
    'systems/swade/templates/actors/vehicle-partials/description-tab.html',
    'systems/swade/templates/actors/vehicle-partials/vitals.html',

    //Gear Cards
    'systems/swade/templates/actors/partials/weapon-card.html',
    'systems/swade/templates/actors/partials/armor-card.html',
    'systems/swade/templates/actors/partials/powers-card.html',
    'systems/swade/templates/actors/partials/shield-card.html',
    'systems/swade/templates/actors/partials/misc-card.html',

    //die type list
    'systems/swade/templates/die-sides-options.html',
    'systems/swade/templates/attribute-select.html',

    // Chat
    'systems/swade/templates/chat/roll-formula.html',

    //Items
    'systems/swade/templates/items/partials/header.html',
    'systems/swade/templates/items/partials/header-delete.html',
    'systems/swade/templates/items/partials/description.html',
    'systems/swade/templates/items/partials/actions.html',
    'systems/swade/templates/items/partials/powers.html',
    'systems/swade/templates/items/partials/ae-header.html',
    'systems/swade/templates/effect-list.html',

    //official sheet
    //main sheet
    'systems/swade/templates/official/sheet.html',

    //tabs
    'systems/swade/templates/official/tabs/summary.hbs',
    'systems/swade/templates/official/tabs/edges.hbs',
    'systems/swade/templates/official/tabs/inventory.hbs',
    'systems/swade/templates/official/tabs/powers.hbs',
    'systems/swade/templates/official/tabs/description.hbs',

    //misc partials
    'systems/swade/templates/official/partials/attributes.html',
    'systems/swade/templates/official/partials/item-card.html',
    'systems/swade/templates/official/partials/skill-card.html',
    'systems/swade/templates/official/partials/setting-fields.html',

    //Sidebar
    'systems/swade/templates/sidebar/combat-tracker.hbs',
  ];

  return loadTemplates(templatePaths);
};
