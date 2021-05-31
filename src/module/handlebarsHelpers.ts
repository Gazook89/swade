import { SWADE } from './config';
import SwadeItem from './entities/SwadeItem';

export const registerCustomHelpers = function () {
  Handlebars.registerHelper('add', function (a, b) {
    const result = parseInt(a) + parseInt(b);
    return result.signedString();
  });

  Handlebars.registerHelper('signedString', function (number) {
    const result = parseInt(number);
    if (isNaN(result)) return '';
    return result.signedString();
  });

  Handlebars.registerHelper('times', function (a, b) {
    return a * b;
  });

  Handlebars.registerHelper('isEmpty', (element) => {
    if (typeof element === undefined) return true;
    if (Array.isArray(element) && element.length) return false;
    if (element === '') return true;
  });

  // Sheet
  Handlebars.registerHelper('localizeSkillAttribute', (attribute) => {
    if (!attribute) return '';
    return game.i18n.localize(SWADE.attributes[attribute].long);
  });

  Handlebars.registerHelper('modifier', (str) => {
    str = str === '' || str === null ? '0' : str;
    const value = typeof str == 'string' ? parseInt(str) : str;
    return value == 0 ? '' : value > 0 ? ` + ${value}` : ` - ${-value}`;
  });

  Handlebars.registerHelper('enrich', (content) => {
    return new Handlebars.SafeString(TextEditor.enrichHTML(content));
  });

  Handlebars.registerHelper('canBeEquipped', (item: SwadeItem) => {
    return item.data['equippable'] || item.data['isVehicular'];
  });

  Handlebars.registerHelper('disabled', (value) => {
    return value ? 'disabled' : '';
  });

  Handlebars.registerHelper('displayEmbedded', (array: any[] = []) => {
    const collection = new Map(array);
    const entities: string[] = [];
    collection.forEach((val: any, key: string) => {
      const type =
        val.type === 'ability'
          ? game.i18n.localize('SWADE.SpecialAbility')
          : game.i18n.localize(`ITEM.Type${val.type.capitalize()}`);

      let majorMinor = '';
      if (val.type === 'hindrance') {
        if (val.data.major) {
          majorMinor = game.i18n.localize('SWADE.Major');
        } else {
          majorMinor = game.i18n.localize('SWADE.Minor');
        }
      }

      entities.push(
        `<li class="flexrow">
          <img src="${val.img}" alt="${type}" class="effect-icon" />
          <span class="effect-label">${type} - ${val.name} ${majorMinor}</span>
          <span class="effect-controls">
            <a class="effect-action delete-embedded" data-Id="${key}">
              <i class="fas fa-trash"></i>
            </a>
          </span>
        </li>`,
      );
    });
    return `<ul class="effects-list">${entities.join('\n')}</ul>`;
  });

  Handlebars.registerHelper('capitalize', (str) => {
    if (typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  Handlebars.registerHelper('isOnHold', (id) => {
    //@ts-ignore
    const c = game.combat.combatants.get(id);
    return c.getFlag('swade', 'roundHeld');
  });

  Handlebars.registerHelper('isNotOnHold', (id) => {
    //@ts-ignore
    const c = game.combat.combatants.get(id);
    if (!c.getFlag('swade', 'roundHeld')) {
      return true;
    } else {
      return false;
    }
  });

  Handlebars.registerHelper('turnLost', (id) => {
    //@ts-ignore
    const c = game.combat.combatants.get(id);
    return c.getFlag('swade', 'turnLost');
  });

  Handlebars.registerHelper('isGroupLeader', (id) => {
    //@ts-ignore
    const c = game.combat.combatants.get(id);
    return c.getFlag('swade', 'isGroupLeader');
  });

  Handlebars.registerHelper('isInGroup', (id) => {
    //@ts-ignore
    const c = game.combat.combatants.get(id);
    return c.getFlag('swade', 'groupId');
  });

  Handlebars.registerHelper('roundHeld', (id) => {
    //@ts-ignore
    const c = game.combat.combatants.get(id);
    return c.getFlag('swade', 'roundHeld');
  });
};
