import IRollOptions from '../../interfaces/IRollOptions';
import { SysItemData } from '../../interfaces/item-data';
import { SWADE } from '../config';
import SwadeDice from '../dice';
import SwadeActor from './SwadeActor';

/**
 * Override and extend the basic :class:`Item` implementation
 * @noInheritDoc
 */
export default class SwadeItem extends Item<SysItemData> {
  get isMeleeWeapon(): boolean {
    const shots = getProperty(this.data, 'data.shots');
    const currentShots = getProperty(this.data, 'data.currentShots');
    return (
      this.type === 'weapon' &&
      ((!shots && !currentShots) || (shots === '0' && currentShots === '0'))
    );
  }

  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData();
  }

  rollDamage(options: IRollOptions = {}): Promise<Roll> | Roll {
    let itemData;
    if (['weapon', 'power', 'shield'].includes(this.type)) {
      itemData = this.data.data;
    } else {
      return null;
    }
    const actor = (this.actor as unknown) as SwadeActor;
    const actorIsVehicle = actor.data.type === 'vehicle';
    const actorData = actor.data.data;
    const label = this.name;
    let ap = getProperty(this.data, 'data.ap');

    if (ap) {
      ap = ` - ${game.i18n.localize('SWADE.Ap')} ${ap}`;
    } else {
      ap = ` - ${game.i18n.localize('SWADE.Ap')} 0`;
    }

    let roll;
    let rollParts = [itemData.damage];

    if (this.type === 'shield' || options.dmgOverride) {
      rollParts = [options.dmgOverride];
    }
    //Additional Mods
    if (options.additionalMods) {
      rollParts = rollParts.concat(options.additionalMods);
    }

    roll = new Roll(rollParts.join(''), actor.getRollShortcuts());

    const newParts: string[] = [];
    roll.terms.forEach((term) => {
      if (term instanceof Die) {
        newParts.push(`${term['number']}d${term.faces}x`);
      } else if (term instanceof Roll) {
        newParts.push(term.formula);
      } else {
        newParts.push(this.makeExplodable(term));
      }
    });

    //Conviction Modifier
    if (
      !actorIsVehicle &&
      game.settings.get('swade', 'enableConviction') &&
      getProperty(actor.data, 'data.details.conviction.active')
    ) {
      newParts.push('+1d6x');
    }

    roll = new Roll(newParts.join(''));

    let flavour = '';
    if (options.flavour) {
      flavour = ` - ${options.flavour}`;
    }

    if (options.suppressChat) {
      return new Roll(newParts.join(''));
    }
    console.log(roll);
    // Roll and return
    return SwadeDice.Roll({
      roll: roll,
      data: actorData,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${game.i18n.localize(label)} ${game.i18n.localize(
        'SWADE.Dmg',
      )}${ap}${flavour}`,
      title: `${game.i18n.localize(label)} ${game.i18n.localize('SWADE.Dmg')}`,
      item: this,
      flags: { swade: { colorMessage: false } },
    });
  }

  getChatData(htmlOptions) {
    const data = duplicate(this.data.data) as any;

    // Rich text description
    data.description = TextEditor.enrichHTML(data.description, htmlOptions);
    data.notes = TextEditor.enrichHTML(data.notes, htmlOptions);

    // Item properties
    const props = [];

    switch (this.type) {
      case 'hindrance':
        props.push(data.major ? 'Major' : 'Minor');
        break;
      case 'shield':
        props.push(
          data.equipped
            ? '<i class="fas fa-tshirt"></i>'
            : '<i class="fas fa-tshirt" style="color:grey"></i>',
        );
        props.push(`<i class='fas fa-shield-alt'></i> ${data.parry}`);
        props.push(`<i class='fas fa-umbrella'></i> ${data.cover}`);
        props.push(
          data.notes ? `<i class="fas fa-sticky-note"></i> ${data.notes}` : '',
        );
        break;
      case 'armor':
        props.push(`<i class='fas fa-shield-alt'></i> ${data.armor}`);
        props.push(
          data.equipped
            ? '<i class="fas fa-tshirt"></i>'
            : '<i class="fas fa-tshirt" style="color:grey"></i>',
        );
        props.push(
          data.notes ? `<i class="fas fa-sticky-note"></i> ${data.notes}` : '',
        );
        props.push(data.locations.head ? game.i18n.localize('SWADE.Head') : '');
        props.push(
          data.locations.torso ? game.i18n.localize('SWADE.Torso') : '',
        );
        props.push(data.locations.arms ? game.i18n.localize('SWADE.Arms') : '');
        props.push(data.locations.legs ? game.i18n.localize('SWADE.Legs') : '');

        break;
      case 'edge':
        props.push(data.requirements.value);
        props.push(data.isArcaneBackground ? 'Arcane' : '');
        break;
      case 'power':
        props.push(
          data.rank,
          data.arcane,
          `${data.pp}PP`,
          `<i class="fas fa-ruler"></i> ${data.range}`,
          data.damage ? `<i class='fas fa-tint'></i> ${data.damage}` : '',
          `<i class='fas fa-hourglass-half'></i> ${data.duration}`,
          data.trapping,
        );
        break;
      case 'weapon':
        props.push(
          data.equipped
            ? '<i class="fas fa-tshirt"></i>'
            : '<i class="fas fa-tshirt" style="color:grey"></i>',
        );
        props.push(
          data.damage ? `<i class='fas fa-tint'></i> ${data.damage}` : '',
        );
        props.push(`<i class='fas fa-shield-alt'></i> ${data.ap}`);
        props.push(`<i class="fas fa-ruler"></i> ${data.range}`);
        props.push(
          data.notes ? `<i class="fas fa-sticky-note"></i> ${data.notes}` : '',
        );
        break;
      case 'item':
        props.push(
          data.equipped
            ? '<i class="fas fa-tshirt"></i>'
            : '<i class="fas fa-tshirt" style="color:grey"></i>',
        );
        break;
    }
    // Filter properties and return
    data.properties = props.filter((p) => !!p);

    //Additional actions
    const actions = getProperty(this.data, 'data.actions.additional');
    data.hasAdditionalActions = !!actions && Object.keys(actions).length > 0;

    data.actions = [];
    for (const action in actions) {
      data.actions.push({
        key: action,
        type: actions[action].type,
        name: actions[action].name,
      });
    }
    return data;
  }

  async show() {
    // Basic template rendering data
    const token = this.actor.token;
    const tokenId = token ? `${token.scene._id}.${token.id}` : null;
    const ammoManagement = game.settings.get('swade', 'ammoManagement');
    const templateData = {
      actor: this.actor,
      tokenId: tokenId,
      item: this.data,
      data: this.getChatData({}),
      config: SWADE,
      hasAmmoManagement:
        this.type === 'weapon' &&
        !this.isMeleeWeapon &&
        ammoManagement &&
        !getProperty(this.data, 'data.autoReload'),
      hasReloadButton:
        ammoManagement &&
        this.type === 'weapon' &&
        getProperty(this.data, 'data.shots') > 0 &&
        !getProperty(this.data, 'data.autoReload'),
      hasDamage: !!getProperty(this.data, 'data.damage'),
      skill: getProperty(this.data, 'data.actions.skill'),
      hasSkillRoll:
        ['weapon', 'power', 'shield'].includes(this.data.type) &&
        !!getProperty(this.data, 'data.actions.skill'),
      powerPoints: this._getPowerPoints(),
    };

    // Render the chat card template
    const template = 'systems/swade/templates/chat/item-card.html';
    const html = await renderTemplate(template, templateData);

    // Basic chat message data
    const chatData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      speaker: {
        actor: this.actor.id,
        token: tokenId,
        alias: this.actor.name,
      },
      flags: { 'core.canPopout': true } as Record<string, unknown>,
    };
    if (
      game.settings.get('swade', 'hideNpcItemChatCards') &&
      this.actor.data.type === 'npc'
    ) {
      chatData['whisper'] = game.users.filter((u: User) => u.isGM);
    }

    // Toggle default roll mode
    const rollMode = game.settings.get('core', 'rollMode');
    if (['gmroll', 'blindroll'].includes(rollMode))
      chatData['whisper'] = ChatMessage.getWhisperRecipients('GM');
    if (rollMode === 'selfroll') chatData['whisper'] = [game.user._id];
    if (rollMode === 'blindroll') chatData['blind'] = true;

    // Create the chat message
    const chatCard = await ChatMessage.create(chatData);
    Hooks.call('swadeChatCard', this.actor, this, chatCard, game.user.id);
    return chatCard;
  }

  private makeExplodable(expresion): string {
    // Make all dice of a roll able to explode
    const diceRegExp = /\d*d\d+[^kdrxc]/g;
    expresion = expresion + ' '; // Just because of my poor reg_exp foo
    const diceStrings = expresion.match(diceRegExp);
    const used = [];
    if (diceStrings) {
      diceStrings.forEach((match) => {
        if (used.indexOf(match) === -1) {
          expresion = expresion.replace(
            new RegExp(match.slice(0, -1), 'g'),
            match.slice(0, -1) + 'x',
          );
          used.push(match);
        }
      });
    }
    return expresion;
  }

  private _getPowerPoints(): { current: number; max: number } {
    if (this.type !== 'power') return { current: null, max: null };

    const arcane = getProperty(this.data, 'data.arcane');
    let current = getProperty(this.actor.data, 'data.powerPoints.value');
    let max = getProperty(this.actor.data, 'data.powerPoints.max');
    if (arcane) {
      current = getProperty(
        this.actor.data,
        `data.powerPoints.${arcane}.value`,
      );
      max = getProperty(this.actor.data, `data.powerPoints.${arcane}.max`);
    }
    return { current, max };
  }
}
