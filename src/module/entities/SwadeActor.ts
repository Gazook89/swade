import { SwadeDice } from '../dice';
import { SwadeItem } from './SwadeItem';

export class SwadeActor extends Actor {
  /**
   * Extends data from base Actor class
   */
  prepareData() {
    super.prepareData();
    return this.data;
  }

  /* -------------------------------------------- */
  /*  Socket Listeners and Handlers
  /* -------------------------------------------- */

  /** @override */
  static async create(data, options = {}) {
    let link = true;

    if (data.type === 'npc') {
      link = false;
    }
    data.token = data.token || {};
    mergeObject(data.token, {
      vision: true,
      dimSight: 30,
      brightSight: 0,
      actorLink: link,
      disposition: 1,
    });

    return super.create(data, options);
  }

  /* -------------------------------------------- */

  /** @override */
  async update(data, options = {}) {
    return super.update(data, options);
  }

  /* -------------------------------------------- */

  /** @override */
  async createOwnedItem(itemData, options) {
    return super.createOwnedItem(itemData, options);
  }

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */
  rollAttribute(abilityId, options = { event: null }) {
    const label = CONFIG.SWADE.attributes[abilityId].long;
    let actorData = this.data as any;
    const abl = actorData.data.attributes[abilityId];
    let exp = '';
    if (this.data['data'].wildcard) {
      exp = `{1d${abl.die.sides}x=, 1d${abl['wild-die'].sides}x=}kh`;
    } else {
      exp = `1d${abl.die.sides}x${abl.die.sides}`;
    }

    //Check and add Modifiers
    const rollParts = [exp] as any[];
    let ablMod = parseInt(abl.die.modifier);
    if (!isNaN(ablMod) && ablMod !== 0) {
      if (ablMod > 0) {
        rollParts.push('+');
      }
      rollParts.push(ablMod);
    }

    if (this.data.data['details']['conviction']['active']) {
      rollParts.push('+1d6x=');
    }

    const woundFatigePenalties = this.calcWoundFatigePenalties();
    if (woundFatigePenalties !== 0) rollParts.push(woundFatigePenalties);

    const statusPenalties = this.calcStatusPenalties();
    if (statusPenalties !== 0) rollParts.push(statusPenalties);

    // Roll and return
    return SwadeDice.Roll({
      event: options.event,
      parts: rollParts,
      data: actorData,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${game.i18n.localize(label)} ${game.i18n.localize(
        'SWADE.AttributeTest',
      )}`,
      title: `${game.i18n.localize(label)} ${game.i18n.localize(
        'SWADE.AttributeTest',
      )}`,
    });
  }

  rollSkill(skillId, options = { event: null }) {
    let items = this.items.filter((i: Item) => i.id == skillId);
    if (!items.length) {
      return;
    }
    let skillData = items[0].data['data'];
    let exp = '';
    if (this.data['data'].wildcard) {
      exp = `{1d${skillData['die'].sides}x=, 1d${skillData['wild-die'].sides}x=}kh`;
    } else {
      exp = `1d${skillData['die'].sides}x=`;
    }

    //Check and add Modifiers
    const rollParts = [exp] as any[];
    let itemMod = parseInt(skillData['die'].modifier);
    if (!isNaN(itemMod) && itemMod !== 0) {
      if (itemMod > 0) {
        rollParts.push('+');
      }
      rollParts.push(itemMod);
    }

    if (
      this.data.data['details']['conviction']['active'] &&
      game.settings.get('swade', 'enableConviction')
    ) {
      rollParts.push('+1d6x=');
    }

    const woundFatigePenalties = this.calcWoundFatigePenalties();
    if (woundFatigePenalties !== 0) rollParts.push(woundFatigePenalties);

    const statusPenalties = this.calcStatusPenalties();
    if (statusPenalties !== 0) rollParts.push(statusPenalties);

    // Roll and return
    return SwadeDice.Roll({
      event: options.event,
      parts: rollParts,
      data: skillData,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${items[0].name} ${game.i18n.localize('SWADE.SkillTest')}`,
      title: `${items[0].name} ${game.i18n.localize('SWADE.SkillTest')}`,
    });
  }

  async spendBenny() {
    let message = await renderTemplate(CONFIG.SWADE.bennies.templates.spend, {
      target: this,
      speaker: game.user,
    });
    let chatData = {
      content: message,
    };
    if (game.settings.get('swade', 'notifyBennies')) {
      ChatMessage.create(chatData);
    }
    let actorData = this.data as any;
    if (actorData.data.bennies.value > 0) {
      await this.update({
        'data.bennies.value': actorData.data.bennies.value - 1,
      });
    }
  }

  async getBenny() {
    let message = await renderTemplate(CONFIG.SWADE.bennies.templates.add, {
      target: this,
      speaker: game.user,
    });
    let chatData = {
      content: message,
    };
    if (game.settings.get('swade', 'notifyBennies')) {
      ChatMessage.create(chatData);
    }
    let actorData = this.data as any;
    await this.update({
      'data.bennies.value': actorData.data.bennies.value + 1,
    });
  }

  async refreshBennies() {
    let message = await renderTemplate(CONFIG.SWADE.bennies.templates.refresh, {
      target: this,
      speaker: game.user,
    });
    let chatData = {
      content: message,
    };
    ChatMessage.create(chatData);
    let actorData = this.data as any;
    await this.update({ 'data.bennies.value': actorData.data.bennies.max });
  }

  //Calculated the wound and fatigue penalites
  calcWoundFatigePenalties(): number {
    let retVal = 0;
    const wounds = parseInt(this.data['data']['wounds']['value']);
    let ignoredWounds = parseInt(this.data['data']['wounds']['ignored']);
    if (isNaN(ignoredWounds)) ignoredWounds = 0;
    const fatigue = parseInt(this.data['data']['fatigue']['value']);

    if (!isNaN(wounds)) {
      if (wounds > 3) {
        retVal += 3;
      } else {
        retVal += wounds;
      }
      if (retVal - ignoredWounds < 0) {
        retVal = 0;
      } else {
        retVal -= ignoredWounds;
      }
    }

    if (!isNaN(fatigue)) retVal += fatigue;
    return retVal * -1;
  }

  calcStatusPenalties(): number {
    let retVal = 0;
    if (this.data.data.status.isDistracted) {
      retVal -= 2;
    }
    return retVal;
  }

  /**
   * Function for shorcut roll in item (@str + 1d6)
   * return something like : {agi: "1d8x8+1", sma: "1d6x6", spi: "1d6x6", str: "1d6x6-1", vig: "1d6x6"}
   */
  getRollShortcuts(bAddWildDie = false) {
    let out = {};

    // Attributes
    const attr = this.data.data.attributes;
    for (const name of ['agility', 'smarts', 'spirit', 'strength', 'vigor']) {
      out[name.substring(0, 3)] =
        `1d${attr[name].die.sides}x=` +
        (attr[name].die.modifier[0] != 0
          ? (['+', '-'].indexOf(attr[name].die.modifier[0]) < 0 ? '+' : '') +
            attr[name].die.modifier
          : '') +
        // wild-die
        (bAddWildDie && attr[name]['wild-die'].sides
          ? `+1d${attr[name]['wild-die'].sides}x=`
          : '');
    } //fr
    return out;
  }

  // Launches a dialog to configure which initiative-modifying edges/hindrances the character has
  async configureInitiative() {
    const initData = this.data.data.initiative;
    const template = 'systems/swade/templates/initiative/configure-init.html';
    const html = await renderTemplate(template, initData);
    const d = new Dialog({
      title: 'Configure Initiative',
      content: html,
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('SWADE.Ok'),
          callback: async (html: JQuery<HTMLElement>) => {
            await this.update({
              'data.initiative': {
                hasLevelHeaded: (html as JQuery)
                  .find('#hasLevelHeaded')
                  .is(':checked'),
                hasImpLevelHeaded: (html as JQuery)
                  .find('#hasImpLevelHeaded')
                  .is(':checked'),
                hasHesitant: (html as JQuery)
                  .find('#hasHesitant')
                  .is(':checked'),
              },
            });
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('SWADE.Cancel'),
        },
      },
      default: 'cancel',
    });
    d.render(true);
  }

  /**
   * Calculates the correct armor value based on SWADE v5.5 and returns that value
   */
  calcArmor(): number {
    let totalArmorVal = 0;
    const armorList = this.items
      .filter(
        (i: SwadeItem) =>
          i.type === 'armor' &&
          i.data.data['equipped'] &&
          i.data.data['locations']['torso'],
      )
      .sort((a, b) => {
        const aValue = parseInt(a.data.data.armor);
        const bValue = parseInt(b.data.data.armor);
        return aValue + bValue;
      });
    if (armorList.length === 0) {
      totalArmorVal = 0;
    } else if (armorList.length > 0 && armorList.length < 2) {
      totalArmorVal = parseInt(armorList[0].data.data.armor);
    } else {
      totalArmorVal =
        parseInt(armorList[0].data.data.armor) +
        parseInt(armorList[1].data.data.armor) / 2;
    }
    return totalArmorVal;
  }
}