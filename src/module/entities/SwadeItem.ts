import { SwadeDice } from '../dice';
import { ItemType } from '../enums/ItemTypeEnum';
// eslint-disable-next-line no-unused-vars
import SwadeActor from './SwadeActor';

/**
 * Override and extend the basic :class:`Item` implementation
 * @noInheritDoc
 */
export default class SwadeItem extends Item {
  /**
   * @override
   */
  get actor() {
    return (this.options.actor as SwadeActor) || null;
  }

  /* -------------------------------------------- */
  /*	Data Preparation														*/
  /* -------------------------------------------- */

  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData();
  }

  rollDamage(options = { event: Event }) {
    const itemData = this.data.data;
    const actor = this.actor;
    const actorIsVehicle = actor.data.type === 'vehicle';
    const actorData = actor.data.data;
    const label = this.name;
    let ap = getProperty(this.data, 'data.ap');

    if (ap) {
      ap = ` - ${game.i18n.localize('SWADE.Ap')} ${ap}`;
    } else {
      ap = ` - ${game.i18n.localize('SWADE.Ap')} 0`;
    }

    // Intermediary roll to let it do the parsing for us
    let roll;
    if (actorIsVehicle) {
      roll = new Roll(itemData.damage).roll();
    } else {
      roll = new Roll(itemData.damage, actor.getRollShortcuts()).roll();
    }
    let newParts = [];
    roll.parts.forEach((part) => {
      if (part instanceof Die) {
        let split = part.formula.split('d');
        newParts.push(`${split[0]}d${part.faces}x=`);
      } else {
        newParts.push(part);
      }
    });

    if (
      !actorIsVehicle &&
      game.settings.get('swade', 'enableConviction') &&
      getProperty(actor.data, 'data.details.conviction.active')
    ) {
      newParts.push('+1d6x=');
    }
    // Roll and return
    return SwadeDice.Roll({
      event: options.event,
      parts: newParts,
      data: actorData,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${game.i18n.localize(label)} ${game.i18n.localize(
        'SWADE.Dmg',
      )}${ap}`,
      title: `${game.i18n.localize(label)} ${game.i18n.localize('SWADE.Dmg')}`,
      item: this,
    });
  }

  getChatData(htmlOptions) {
    const data = duplicate(this.data.data);

    // Rich text description
    data.description = TextEditor.enrichHTML(data.description, htmlOptions);
    data.notes = TextEditor.enrichHTML(data.notes, htmlOptions);
    console.log(data.notes);

    // Item properties
    const props = [];

    switch (this.data.type) {
      case 'hindrance':
        props.push(data.major ? 'Major' : 'minor');
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
        props.push(data.locations.head ? 'Head' : '');
        props.push(data.locations.torso ? 'Torso' : '');
        props.push(data.locations.arms ? 'Arms' : '');
        props.push(data.locations.legs ? 'Legs' : '');

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
          `<i class='fas fa-tint'></i> ${data.damage}`,
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
        props.push(`<i class='fas fa-tint'></i> ${data.damage}`);
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
    return data;
  }

  async show() {
    // Basic template rendering data
    const token = this.actor.token;
    const templateData = {
      actor: this.actor,
      tokenId: token ? `${token.scene._id}.${token.id}` : null,
      item: this.data,
      data: this.getChatData({}),
      config: CONFIG.SWADE,
      hasDamage: this.data.data.damage,
      skill: this.data.data.skill,
      hasSkillRoll:
        [ItemType.Weapon.toString(), ItemType.Power.toString()].includes(
          this.data.type,
        ) && this.data.data.skill,
    };

    // Render the chat card template
    const template = 'systems/swade/templates/chat/item-card.html';
    const html = await renderTemplate(template, templateData);

    // Basic chat message data
    const chatData = {
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      speaker: {
        actor: this.actor._id,
        token: this.actor.token,
        alias: this.actor.name,
      },
    };

    // Toggle default roll mode
    let rollMode = game.settings.get('core', 'rollMode');
    if (['gmroll', 'blindroll'].includes(rollMode))
      chatData['whisper'] = ChatMessage.getWhisperRecipients('GM');
    if (rollMode === 'selfroll') chatData['whisper'] = [game.user._id];
    if (rollMode === 'blindroll') chatData['blind'] = true;

    // Create the chat message
    return ChatMessage.create(chatData);
  }

  static async _onChatCardAction(event) {
    event.preventDefault();

    // Extract card data
    const button = event.currentTarget;
    button.disabled = true;
    const card = button.closest('.chat-card');
    const messageId = card.closest('.message').dataset.messageId;
    const message = game.messages.get(messageId);
    const action = button.dataset.action;

    // Validate permission to proceed with the roll
    const isTargetted = action === 'save';
    if (!(isTargetted || game.user.isGM || message.isAuthor)) return;

    // Get the Actor from a synthetic Token
    const actor = this._getChatCardActor(card);
    if (!actor) return;

    // Get the Item
    const item = actor.getOwnedItem(card.dataset.itemId) as SwadeItem;
    if (!item) {
      return ui.notifications.error(
        `The requested item ${card.dataset.itemId} no longer exists on Actor ${actor.name}`,
      );
    }

    // Get card targets
    let targets = [];
    if (isTargetted) {
      targets = this._getChatCardTargets(card);
    }

    // Attack and Damage Rolls
    if (action === 'damage') {
      await item.rollDamage({ event });
    } else if (action === 'formula') {
      let skill = actor.items.find(
        (i: SwadeItem) =>
          i.type === ItemType.Skill && i.name === item.data.data.skill,
      );
      if (skill) {
        await actor.rollSkill(skill.id);
      } else {
        await actor.makeUnskilledAttempt();
      }
    }

    // Re-enable the button
    button.disabled = false;
  }

  static _getChatCardActor(card): SwadeActor {
    // Case 1 - a synthetic actor from a Token
    const tokenKey = card.dataset.tokenId;
    if (tokenKey) {
      const [sceneId, tokenId] = tokenKey.split('.');
      const scene = game.scenes.get(sceneId);
      if (!scene) return null;
      const tokenData = scene.getEmbeddedEntity('Token', tokenId);
      if (!tokenData) return null;
      const token = new Token(tokenData);
      return token.actor as SwadeActor;
    }

    // Case 2 - use Actor ID directory
    const actorId = card.dataset.actorId;
    return (game.actors.get(actorId) as SwadeActor) || (null as SwadeActor);
  }

  static _getChatCardTargets(card) {
    const character = game.user.character;
    const controlled = canvas.tokens.controlled;
    const targets = controlled.reduce(
      (arr, t) => (t.actor ? arr.concat([t.actor]) : arr),
      [],
    );
    if (character && controlled.length === 0) targets.push(character);
    return targets;
  }
}
