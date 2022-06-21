import { Context } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import { ChatMessageDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData';
import { ItemDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData';
import { ItemData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/module.mjs';
import {
  ItemAction,
  TraitRollModifier,
} from '../../../interfaces/additional.interface';
import IRollOptions from '../../../interfaces/RollOptions.interface';
import * as util from '../../util';
import SwadeActor from '../actor/SwadeActor';

declare global {
  interface DocumentClassConfig {
    Item: typeof SwadeItem;
  }
  interface FlagConfig {
    Item: {
      swade: {
        embeddedAbilities: [string, ItemData['_source']][];
        embeddedPowers: [string, ItemData['_source']][];
        [key: string]: unknown;
      };
    };
  }
}

export default class SwadeItem extends Item {
  overrides: DeepPartial<Record<string, string | number | boolean>> = {};

  static RANGE_REGEX = /[0-9]+\/*/g;

  constructor(data?: ItemDataConstructorData, context?: Context<SwadeActor>) {
    super(data, context);
    this.overrides = this.overrides ?? {};
  }

  get isMeleeWeapon(): boolean {
    if (this.data.type !== 'weapon') return false;
    const shots = this.data.data.shots;
    const currentShots = this.data.data.currentShots;
    return (!shots && !currentShots) || (shots === 0 && currentShots === 0);
  }

  get range() {
    //return early if the type doesn't match
    if (this.data.type !== 'weapon' && this.data.type !== 'power') return;
    //match the range string via Regex
    const match = this.data.data.range.match(SwadeItem.RANGE_REGEX);
    //return early if nothing is found
    if (!match) return;
    //split the string and convert the values to numbers
    const ranges = match.join('').split('/');
    //make sure the array is 3 values long
    const increments = Array.from(
      { ...ranges, length: 4 },
      (v) => Number(v) || 0,
    );
    return {
      short: increments[0],
      medium: increments[1],
      long: increments[2],
      extreme: increments[3] || increments[2] * 4,
    };
  }

  /**
   * @returns whether this item can be an arcane device
   */
  get canBeArcaneDevice(): boolean {
    return ['gear', 'armor', 'shield', 'weapon'].includes(this.type);
  }

  rollDamage(options: IRollOptions = {}) {
    const modifiers = new Array<TraitRollModifier>();
    let itemData;
    if (['weapon', 'power', 'shield'].includes(this.type)) {
      itemData = this.data.data;
    } else {
      return null;
    }
    const actor = this.actor!;
    const label = this.name;
    let ap = getProperty(this.data, 'data.ap');

    if (ap) {
      ap = ` - ${game.i18n.localize('SWADE.Ap')} ${ap}`;
    } else {
      ap = ` - ${game.i18n.localize('SWADE.Ap')} 0`;
    }

    let rollParts = [itemData.damage];

    if (this.type === 'shield' || options.dmgOverride) {
      rollParts = [options.dmgOverride];
    }
    //Additional Mods
    if (options.additionalMods) {
      modifiers.push(...options.additionalMods);
    }

    const terms = Roll.parse(rollParts.join(''), actor.getRollData());
    const baseRoll = new Array<String>();
    for (const term of terms) {
      if (term instanceof Die) {
        if (!term.modifiers.includes('x') && !term.options.flavor) {
          term.modifiers.push('x');
        }
        baseRoll.push(term.formula);
      } else if (term instanceof StringTerm) {
        baseRoll.push(this._makeExplodable(term.term));
      } else {
        baseRoll.push(term.expression);
      }
    }

    //Conviction Modifier
    if (
      actor.data.type !== 'vehicle' &&
      game.settings.get('swade', 'enableConviction') &&
      actor.data.data.details.conviction.active
    ) {
      modifiers.push({
        label: game.i18n.localize('SWADE.Conv'),
        value: '+1d6x',
      });
    }

    let flavour = '';
    if (options.flavour) {
      flavour = ` - ${options.flavour}`;
    }

    //Joker Modifier
    if (actor.hasJoker) {
      modifiers.push({
        label: game.i18n.localize('SWADE.Joker'),
        value: '+2',
      });
    }

    const roll = new Roll(baseRoll.join(''));

    /**
     * A hook event that is fired before damage is rolled, giving the opportunity to programatically adjust a roll and its modifiers
     * @function rollDamage
     * @memberof hookEvents
     * @param {Actor} actor                     The actor that owns the item which rolls the damage
     * @param {Item} item                       The item that is used to create the damage value
     * @param {Roll} roll                       The built base roll, without any modifiers
     * @param {TraitRollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    Hooks.call('swadeRollDamage', this.actor, this, roll, modifiers, options);

    if (options.suppressChat) {
      return Roll.fromTerms([
        ...roll.terms,
        ...Roll.parse(
          modifiers.reduce(util.modifierReducer, ''),
          this.getRollData(),
        ),
      ]);
    }

    // Roll and return
    return game.swade.RollDialog.asPromise({
      roll: roll,
      mods: modifiers,
      speaker: ChatMessage.getSpeaker({ actor: this.actor! }),
      flavor: `${label} ${game.i18n.localize('SWADE.Dmg')}${ap}${flavour}`,
      title: `${label} ${game.i18n.localize('SWADE.Dmg')}`,
      item: this,
      flags: { swade: { colorMessage: false } },
    });
  }

  getChatData(htmlOptions = {}) {
    const data = deepClone(this.data.data) as any;

    // Rich text description
    data.description = TextEditor.enrichHTML(data.description, htmlOptions);
    data.notes = TextEditor.enrichHTML(data.notes, htmlOptions);

    // Item properties
    const props = new Array<string>();

    switch (this.type) {
      case 'hindrance':
        props.push(
          data.major
            ? game.i18n.localize('SWADE.Major')
            : game.i18n.localize('SWADE.Minor'),
        );
        break;
      case 'shield':
        props.push(
          data.equipped
            ? `<i class="fas fa-tshirt" title="${game.i18n.localize('SWADE.Equipped')}"></i>`
            : `<i class="fas fa-tshirt" style="color:grey" title="${game.i18n.localize('SWADE.Unequipped')}"></i>`,
          data.parry ? `<i class='fas fa-user-shield' title='${game.i18n.localize('SWADE.Parry')}'></i> ${data.parry}`: '',
          data.cover ? `<i class='fas fa-umbrella' title='${game.i18n.localize('SWADE.Cover._name')}'></i> ${data.cover}` : '',
          data.weight ? `<i class='fas fa-weight-hanging' title='${game.i18n.localize('SWADE.Weight')}'></i> ${data.weight}` : '',
          data.minStr ? `<i class='fas fa-dumbbell' title='${game.i18n.localize('SWADE.MinStrLong')}'></i> ${data.minStr}` : '',
          data.notes ? `<i class="fas fa-sticky-note" title='${game.i18n.localize('SWADE.Notes')}'></i> ${data.notes}` : '',
        );
        break;
      case 'armor':
        for(const loc in data.locations){
          data.locations[loc] != false ? props.push(game.i18n.localize(`SWADE.${loc.charAt(0).toUpperCase() + loc.slice(1)}`)) : '';
        }
        props.push(
          data.equipped
            ? `<i class="fas fa-tshirt" title="${game.i18n.localize('SWADE.Equipped')}"></i>`
            : `<i class="fas fa-tshirt" style="color:grey" title="${game.i18n.localize('SWADE.Unequipped')}"></i>`,
          data.armor ? `<i class='fas fa-shield-alt' title='${game.i18n.localize('SWADE.Armor')}'></i> ${data.armor}` : '',
          data.cover ? `<i class='fas fa-umbrella' title='${game.i18n.localize('SWADE.Cover._name')}'></i> ${data.cover}` : '',
          data.weight ? `<i class='fas fa-weight-hanging' title='${game.i18n.localize('SWADE.Weight')}'></i> ${data.weight}` : '',
          data.minStr ? `<i class='fas fa-dumbbell' title='${game.i18n.localize('SWADE.MinStrLong')}'></i> ${data.minStr}` : '',
          data.notes ? `<i class="fas fa-sticky-note" title='${game.i18n.localize('SWADE.Notes')}'></i> ${data.notes}` : '',
        );
        break;
      case 'edge':
        props.push(data.requirements.value);
        props.push(data.isArcaneBackground ? 'Arcane' : '');
        break;
      case 'power':
        props.push(data.rank);
        props.push(data.arcane);
        props.push(`${data.pp} ${game.i18n.localize('SWADE.PPAbbreviation')}`);
        props.push(`<i class="fas fa-ruler" title='${game.i18n.localize('SWADE.Range._name')}'></i> ${data.range}`);
        props.push(`<i class='fas fa-shield-alt' title='${game.i18n.localize('SWADE.Ap')}'></i> ${data.ap}`);
        props.push(`<i class='fas fa-hourglass-half' title='${game.i18n.localize('SWADE.Dur')}'></i> ${data.duration}`);
        props.push(data.trapping);
        break;
      case 'weapon':
        props.push(
          data.equipped 
          ? `<i class="fas fa-tshirt" title="${game.i18n.localize('SWADE.Equipped')}"></i>` 
          : `<i class="fas fa-tshirt" style="color:grey" title="${game.i18n.localize('SWADE.Unequipped')}"></i>`,
          data.damage ? `<i class="fas fa-fist-raised" title='${game.i18n.localize('SWADE.Dmg')}'></i> ${data.damage}` : '',
          data.ap ? `<i class='fas fa-shield-alt' title='${game.i18n.localize('SWADE.Ap')}'></i> ${data.ap}` : '',
          data.parry ? `<i class='fas fa-user-shield' title='${game.i18n.localize('SWADE.Parry')}'></i> ${data.parry}` : '',
          data.range ? `<i class='fas fa-ruler' title='${game.i18n.localize('SWADE.Range._name')}'></i> ${data.range}` : '',
          data.rof ? `<i class='fas fa-tachometer-alt' title='${game.i18n.localize('SWADE.RoF')}'></i> ${data.rof}` : '',
          data.weight ? `<i class='fas fa-weight-hanging' title='${game.i18n.localize('SWADE.Weight')}'></i> ${data.weight}` : '',
          data.notes ? `<i class="fas fa-sticky-note" title='${game.i18n.localize('SWADE.Notes')}'></i> ${data.notes}` : '',
        );
        break;
      default:
        break;
    }
    // Filter properties and return
    data.properties = props.filter((p) => !!p);

    //Additional actions
    const actions = getProperty(this.data, 'data.actions.additional');

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

  /** A shorthand function to roll skills directly */
  async roll(options: IRollOptions = {}) {
    //return early if there's no parent or this isn't a skill
    if (this.data.type !== 'skill' || !this.parent) return null;
    return this.parent.rollSkill(this.id, options);
  }

  /**
   * Assembles data and creates a chat card for the item
   * @returns the rendered chatcard
   */
  async show() {
    // Basic template rendering data
    if (!this.actor) return;
    const token = this.actor.token;

    const tokenId = token ? `${token.parent!.id}.${token.id}` : null;
    const ammoManagement = game.settings.get('swade', 'ammoManagement');
    const hasAmmoManagement =
      this.type === 'weapon' &&
      !this.isMeleeWeapon &&
      ammoManagement &&
      !getProperty(this.data, 'data.autoReload');
    const hasDamage = !!getProperty(this.data, 'data.damage');
    const hasTraitRoll =
      ['weapon', 'power', 'shield'].includes(this.data.type) &&
      !!getProperty(this.data, 'data.actions.skill');
    const hasReloadButton =
      ammoManagement &&
      this.type === 'weapon' &&
      getProperty(this.data, 'data.shots') > 0 &&
      !getProperty(this.data, 'data.autoReload');

    const additionalActions: Record<string, ItemAction> =
      getProperty(this.data, 'data.actions.additional') || {};
    const hasAdditionalActions = !isObjectEmpty(additionalActions);

    const hasTraitActions = Object.values(additionalActions).some(
      (v) => v.type === 'skill',
    );
    const hasDamageActions = Object.values(additionalActions).some(
      (v) => v.type === 'damage',
    );

    const templateData = {
      actor: this.actor,
      tokenId: tokenId,
      item: this.data,
      data: this.getChatData(),
      hasAmmoManagement: hasAmmoManagement,
      hasReloadButton: hasReloadButton,
      hasDamage: hasDamage,
      showDamageRolls: hasDamage || hasDamageActions,
      hasAdditionalActions: hasAdditionalActions,
      trait: getProperty(this.data, 'data.actions.skill'),
      hasTraitRoll: hasTraitRoll,
      showTraitRolls: hasTraitRoll || hasTraitActions,
      powerPoints: this._getPowerPoints(),
      settingrules: {
        noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
      },
    };

    // Render the chat card template
    const template = 'systems/swade/templates/chat/item-card.hbs';
    const html = await renderTemplate(template, templateData);

    // Basic chat message data
    const chatData: ChatMessageDataConstructorData = {
      user: game.user!.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      speaker: {
        actor: this.parent?.id,
        token: tokenId,
        scene: token?.parent?.id,
        alias: this.parent?.name,
      },
      flags: { 'core.canPopout': true },
    };

    if (
      game.settings.get('swade', 'hideNpcItemChatCards') &&
      this.actor!.data.type === 'npc'
    ) {
      chatData.whisper = game.users!.filter((u) => u.isGM).map((u) => u.id!);
    }

    // Toggle default roll mode
    const rollMode = game.settings.get('core', 'rollMode');
    if (['gmroll', 'blindroll'].includes(rollMode))
      chatData.whisper = ChatMessage.getWhisperRecipients('GM').map(
        (u) => u.id!,
      );
    if (rollMode === 'selfroll') chatData.whisper = [game.user!.id!];
    if (rollMode === 'blindroll') chatData.blind = true;

    // Create the chat message
    const chatCard = await ChatMessage.create(chatData);
    Hooks.call('swadeChatCard', this.actor, this, chatCard, game.user!.id);
    return chatCard;
  }

  private _makeExplodable(expresion: string): string {
    // Make all dice of a roll able to explode
    const diceRegExp = /\d*d\d+[^kdrxc]/g;
    expresion = expresion + ' '; // Just because of my poor reg_exp foo
    const diceStrings: string[] = expresion.match(diceRegExp) || [];
    const used = new Array<string>();
    for (const match of diceStrings) {
      if (used.indexOf(match) === -1) {
        expresion = expresion.replace(
          new RegExp(match.slice(0, -1), 'g'),
          match.slice(0, -1) + 'x',
        );
        used.push(match);
      }
    }
    return expresion;
  }

  /** @returns the power points for the AB that this power belongs to or null when the item is not a power */
  private _getPowerPoints(): { current: number; max: number } | null {
    if (this.type !== 'power') return null;

    const arcane: string = getProperty(this.data, 'data.arcane');
    let current: number = getProperty(
      this.actor!.data,
      'data.powerPoints.value',
    );
    let max: number = getProperty(this.actor!.data, 'data.powerPoints.max');
    if (arcane) {
      current = getProperty(
        this.actor!.data,
        `data.powerPoints.${arcane}.value`,
      );
      max = getProperty(this.actor!.data, `data.powerPoints.${arcane}.max`);
    }
    return { current, max };
  }

  override async _preCreate(data, options, user: User) {
    await super._preCreate(data, options, user);
    //Set default image if no image already exists
    if (!data.img) {
      this.data.update({ img: `systems/swade/assets/icons/${data.type}.svg` });
    }

    if (this.parent) {
      if (data.type === 'skill' && options.renderSheet !== null) {
        options.renderSheet = true;
      }
      if (
        this.parent.type === 'npc' &&
        hasProperty(this.data, 'data.equippable')
      ) {
        this.data.update({ 'data.equipped': true });
      }
    }
  }

  override async _preDelete(options, user: User) {
    await super._preDelete(options, user);
    //delete all transferred active effects from the actor
    if (this.parent) {
      const toDelete = this.parent.effects
        .filter((e) => e.data.origin === this.uuid)
        .map((ae) => ae.id!);
      await this.parent.deleteEmbeddedDocuments('ActiveEffect', toDelete);
    }
  }

  override async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);

    if (this.parent && hasProperty(changed, 'data.equipped')) {
      //toggle all active effects when an item equip status changes
      const updates = this.parent.effects
        .filter((ae) => ae.data.origin === this.uuid)
        .map((ae) => {
          return { _id: ae.id, disabled: !changed.data.equipped };
        });
      await this.parent.updateEmbeddedDocuments('ActiveEffect', updates);
    }
  }
}
