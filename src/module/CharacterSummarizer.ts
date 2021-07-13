import { AdditionalStat } from '../interfaces/additional';
import SwadeActor from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';

/**
 * Produce short, plaintext summaries of the most important aspects of an Actor's character sheet.
 */
export default class CharacterSummarizer {
  // For now, this code is unused:
  // TODO: add a UI to invoke this
  // In the meantime, for testing, it can be invoked by a macro:
  /*
    function showDialog(content) {
    new Dialog({
        title: "Character summary",
        content: content,
        buttons: {cancel: {label: "Ok"}}
    }).render(true);
    }

    let a = game.actors.values().next().value;
    let s = new game.swade.CharacterSummarizer(a);
    showDialog(s.getSummary());
    */
  actor: SwadeActor;

  constructor(actor: SwadeActor) {
    this.actor = actor;

    const type: String = getProperty(actor.data, 'type');
    if (type !== 'character' && type !== 'npc') {
      // probably need better error checking than this
      ui.notifications?.error(
        "Can't do character summariser against actor of type " + type,
      );
    }
  }

  getSummary() {
    let summary = `<h1>${this.actor.name}</h1>`;

    // Basic character information block
    summary += '<p><strong>' + game.i18n.localize('SWADE.Race') + '</strong>: ';
    summary += getProperty(this.actor.data, 'data.details.species.name');
    summary +=
      '<br/><strong>' + game.i18n.localize('SWADE.Rank') + '</strong>: ';
    summary += getProperty(this.actor.data, 'data.advances.rank');
    summary += ' (' + getProperty(this.actor.data, 'data.advances.value');
    summary += ' ' + game.i18n.localize('SWADE.Adv');
    summary +=
      ')<br/><strong>' + game.i18n.localize('SWADE.Bennies') + '</strong>: ';
    summary += getProperty(this.actor.data, 'data.bennies.max') + '</p>';

    // Attributes
    const attributes = new Array();
    attributes.push(
      game.i18n.localize('SWADE.AttrAgiShort') +
        ' ' +
        this._formatDieStat(this.actor, 'data.attributes.agility.die'),
    );
    attributes.push(
      game.i18n.localize('SWADE.AttrSmaShort') +
        ' ' +
        this._formatDieStat(this.actor, 'data.attributes.smarts.die'),
    );
    attributes.push(
      game.i18n.localize('SWADE.AttrSprShort') +
        ' ' +
        this._formatDieStat(this.actor, 'data.attributes.spirit.die'),
    );
    attributes.push(
      game.i18n.localize('SWADE.AttrStrShort') +
        ' ' +
        this._formatDieStat(this.actor, 'data.attributes.strength.die'),
    );
    attributes.push(
      game.i18n.localize('SWADE.AttrVigShort') +
        ' ' +
        this._formatDieStat(this.actor, 'data.attributes.vigor.die'),
    );
    summary += this._formatList(
      attributes,
      game.i18n.localize('SWADE.Attributes'),
    );

    // Speed, pace, toughness
    summary +=
      '<p><strong>' +
      game.i18n.localize('SWADE.Pace') +
      '</strong>: ' +
      getProperty(this.actor.data, 'data.stats.speed.value') +
      ', ';
    summary +=
      '<strong>' +
      game.i18n.localize('SWADE.Parry') +
      '</strong>: ' +
      getProperty(this.actor.data, 'data.stats.parry.value') +
      ', ';
    summary +=
      '<strong>' +
      game.i18n.localize('SWADE.Tough') +
      '</strong>: ' +
      getProperty(this.actor.data, 'data.stats.toughness.value');
    summary +=
      ' (' +
      getProperty(this.actor.data, 'data.stats.toughness.armor') +
      ')</p>';

    // Items - skills, powers, gear, etc
    const skills = new Array();
    const edges = new Array();
    const hindrances = new Array();
    const weaponsAndArmour = new Array();
    const gear = new Array();
    const powers = new Array();
    const abilities = new Array();

    this.actor.items.forEach((item) => {
      let damage, range, ap, rof, armor;
      switch (item.type) {
        case 'skill':
          skills.push(item.name + ' ' + this._formatDieStat(item, 'data.die'));
          break;
        case 'edge':
          edges.push(item.name);
          break;
        case 'hindrance':
          hindrances.push(item.name);
          break;
        case 'weapon':
          damage = getProperty(item.data, 'data.damage');
          range = getProperty(item.data, 'data.range');
          ap = getProperty(item.data, 'data.ap');
          rof = getProperty(item.data, 'data.rof');
          weaponsAndArmour.push(
            `${item.name} (${damage}, ${range}, ` +
              `${game.i18n.localize('SWADE.Ap')}${ap}, ` +
              `${game.i18n.localize('SWADE.RoF')}${rof})`,
          );
          break;
        case 'armor':
          armor = getProperty(item.data, 'data.armor');
          weaponsAndArmour.push(`${item.name} (${armor})`);
          break;
        case 'gear':
          gear.push(item.name);
          break;
        case 'power':
          powers.push(item.name);
          break;
        case 'ability':
          abilities.push(item.name);
          break;
        default:
          ui.notifications?.error(
            `Item ${item.name} has unknown type ${item.type}`,
          );
      }
    });

    summary += this._formatList(skills, game.i18n.localize('SWADE.Skills'));
    summary += this._formatList(edges, game.i18n.localize('SWADE.Edges'));
    summary += this._formatList(
      hindrances,
      game.i18n.localize('SWADE.Hindrances'),
    );

    summary += this._formatList(
      weaponsAndArmour,
      game.i18n.localize('SWADE.WeaponsAndArmor'),
    );
    summary += this._formatList(gear, game.i18n.localize('SWADE.Inv'));
    summary += this._formatList(powers, game.i18n.localize('SWADE.Pow'));
    summary += this._formatList(
      abilities,
      game.i18n.localize('SWADE.SpecialAbilities'),
    );

    // Additional stats
    const additionalStats = new Array();
    Object.keys(getProperty(this.actor.data, 'data.additionalStats')).forEach(
      (additionalStatKey) => {
        const stat = getProperty(
          this.actor.data,
          `data.additionalStats.${additionalStatKey}`,
        ) as AdditionalStat;
        switch (stat.dtype) {
          case 'String':
            additionalStats.push(`${stat.label}: ${stat.value}`);
            break;
          case 'Number':
            if (stat.hasMaxValue) {
              additionalStats.push(`${stat.label}: ${stat.value}/${stat.max}`);
            } else {
              additionalStats.push(`${stat.label}: ${stat.value}`);
            }
            break;
          case 'Die':
            additionalStats.push(
              `${stat.label}: ${stat.value}` +
                this._formatModifier(stat.modifier),
            );
            break;
          case 'Boolean':
            if (stat.value) {
              additionalStats.push(
                `${stat.label}: ${game.i18n.localize('SWADE.Yes')}`,
              );
            } else {
              additionalStats.push(
                `${stat.label}: ${game.i18n.localize('SWADE.No')}`,
              );
            }
            break;
          default:
            ui.notifications?.error(
              `For ${additionalStatKey}, cannot process additionalStat of type ${stat.dtype}`,
            );
        }
      },
    );

    summary += this._formatList(
      additionalStats,
      game.i18n.localize('SWADE.AddStats'),
    );

    return summary;
  }

  private _formatList(list, name) {
    if (list.length === 0) {
      list.push('&mdash;');
    }
    list.sort();
    let val = `<p><strong>${name}: </strong>`;
    val += list.join(', ');
    val += '</p>';
    return val;
  }

  private _formatDieStat(entity: SwadeItem | SwadeActor, dataKey: String) {
    const sides = getProperty(entity.data, dataKey + '.sides');
    const modifier = getProperty(entity.data, dataKey + '.modifier');
    const val = `d${sides}` + this._formatModifier(modifier);
    return val;
  }

  private _formatModifier(modifier) {
    if (modifier === undefined || modifier === null || modifier === 0) {
      return '';
    }

    if (!!modifier && !String(modifier).match(/^[+-]/)) {
      modifier = '+' + modifier;
    }
    return modifier;
  }

  // This is currently unused but will be used later
  private _getSkillAboveAttributeInSteps(skill: SwadeItem) {
    const linkedAttributeName = getProperty(skill.data, 'data.attribute');
    if (linkedAttributeName === undefined || linkedAttributeName === '') {
      return 0;
    }
    const sidesDelta =
      getProperty(skill.data, 'data.die.sides') -
      getProperty(
        this.actor.data,
        `data.attributes.${linkedAttributeName}.die.sides`,
      );
    return sidesDelta / 2;
  }
}