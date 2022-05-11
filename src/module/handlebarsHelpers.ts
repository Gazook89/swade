import { SWADE } from './config';
import { constants } from './constants';
import SwadeItem from './documents/item/SwadeItem';

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

  Handlebars.registerHelper('times', function (a: number, b: number) {
    return a * b;
  });

  Handlebars.registerHelper('formatNumber', function (number) {
    return Math.round((number + Number.EPSILON) * 1000) / 1000;
  });

  Handlebars.registerHelper('isEmpty', (element) => {
    if (typeof element === undefined) return true;
    if (Array.isArray(element) && element.length) return false;
    if (element === '') return true;
  });

  // Sheet
  Handlebars.registerHelper(
    'localizeSkillAttribute',
    (attribute, useShorthand = false) => {
      if (!attribute) return '';
      return game.i18n.localize(
        useShorthand
          ? SWADE.attributes[attribute].short
          : SWADE.attributes[attribute].long,
      );
    },
  );

  Handlebars.registerHelper('advanceType', (type: number) => {
    switch (type) {
      case constants.ADVANCE_TYPE.EDGE:
        return game.i18n.localize('SWADE.Advances.Types.Edge');
      case constants.ADVANCE_TYPE.SINGLE_SKILL:
        return game.i18n.localize('SWADE.Advances.Types.SingleSkill');
      case constants.ADVANCE_TYPE.TWO_SKILLS:
        return game.i18n.localize('SWADE.Advances.Types.TwoSkills');
      case constants.ADVANCE_TYPE.ATTRIBUTE:
        return game.i18n.localize('SWADE.Advances.Types.Attribute');
      case constants.ADVANCE_TYPE.HINDRANCE:
        return game.i18n.localize('SWADE.Advances.Types.Hindrance');
      default:
        return 'Unknown';
    }
  });

  Handlebars.registerHelper('modifier', (str: string) => {
    str = str === '' || str === null ? '0' : str;
    const value = typeof str == 'string' ? Number(str) : str;
    return value == 0 ? '' : value > 0 ? ` + ${value}` : ` - ${-value}`;
  });

  Handlebars.registerHelper('enrich', (content: string) => {
    return new Handlebars.SafeString(TextEditor.enrichHTML(content));
  });

  Handlebars.registerHelper('canBeEquipped', (item: SwadeItem) => {
    return item.data.data['equippable'] || item.data.data['isVehicular'];
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
            <a class="delete-embedded" data-Id="${key}">
              <i class="fas fa-trash"></i>
            </a>
          </span>
        </li>`,
      );
    });
    return `<ul class="effects-list">${entities.join('\n')}</ul>`;
  });

  Handlebars.registerHelper('capitalize', (str: string) => {
    if (typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  Handlebars.registerHelper('isOnHold', (id: string) => {
    const c = game.combat?.combatants.get(id)!;
    return c.roundHeld;
  });

  Handlebars.registerHelper('isNotOnHold', (id: string) => {
    const c = game.combat?.combatants.get(id)!;
    if (!c.roundHeld) {
      return true;
    } else {
      return false;
    }
  });

  Handlebars.registerHelper('turnLost', (id: string) => {
    const c = game.combat?.combatants.get(id)!;
    return c.turnLost;
  });

  Handlebars.registerHelper('isGroupLeader', (id: string) => {
    const c = game.combat?.combatants.get(id)!;
    return c.isGroupLeader;
  });

  Handlebars.registerHelper('isInGroup', (id: string) => {
    const c = game.combat?.combatants.get(id)!;
    return c.groupId!;
  });

  Handlebars.registerHelper('roundHeld', (id: string) => {
    const c = game.combat?.combatants.get(id)!;
    return c.roundHeld;
  });

  Handlebars.registerHelper('leaderColor', (id: string) => {
    const c = game.combat?.combatants.get(id)!;
    const leaderId = c.groupId!;

    const leader = game.combat?.combatants.get(leaderId)!;
    const groupColor = hasProperty(leader, 'data.flags.swade.groupColor');
    if (groupColor) {
      return leader.getFlag('swade', 'groupColor');
    } else {
      if (leader?.players?.length) {
        return leader.players[0].data.color;
      } else {
        return game.users?.find((u) => u.isGM)?.data.color;
      }
    }
  });

  Handlebars.registerHelper('groupColor', (id: string) => {
    const c = game.combat?.combatants.get(id)!;
    const groupColor = c.getFlag('swade', 'groupColor');
    if (groupColor) {
      return groupColor;
    } else {
      if (c?.players?.length) {
        return c.players[0].data.color;
      } else {
        const gm = game.users?.find((u) => u.isGM)!;
        return gm.data.color;
      }
    }
  });
};
