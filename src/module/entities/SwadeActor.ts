/* eslint-disable no-unused-vars */
import SwadeDice from '../dice';
import IRollOptions from '../../interfaces/IRollOptions';
import SwadeItem from './SwadeItem';

/**
 * @noInheritDoc
 */
export default class SwadeActor extends Actor {
  /**
   * @override
   * Extends data from base Actor class
   */
  prepareData() {
    this.data = duplicate(this['_data']);
    if (!this.data.img) this.data.img = CONST.DEFAULT_TOKEN;
    if (!this.data.name) this.data.name = 'New ' + this.entity;
    this.prepareBaseData();
    this.prepareEmbeddedEntities();
    this.applyActiveEffects();
    this.prepareDerivedData();
  }

  /**
   * @override
   */
  prepareBaseData() {
    //auto calculations
    let shouldAutoCalcToughness =
      getProperty(this.data, 'data.details.autoCalcToughness') &&
      this.data.type !== 'vehicle';

    if (shouldAutoCalcToughness) {
      const toughnessKey = 'data.stats.toughness.value';
      const armorKey = 'data.stats.toughness.armor';
      setProperty(this.data, toughnessKey, this.calcToughness());
      setProperty(this.data, armorKey, this.calcArmor());
    }
  }

  /**
   * @override
   */
  prepareDerivedData() {
    //return early for Vehicles
    if (this.data.type === 'vehicle') return;

    //modify pace with wounds
    if (game.settings.get('swade', 'enableWoundPace')) {
      const wounds = getProperty(this.data, 'data.wounds.value');
      const pace = getProperty(this.data, 'data.stats.speed.value');
      let adjustedPace = parseInt(pace) - parseInt(wounds);
      if (adjustedPace < 1) adjustedPace = 1;
      setProperty(this.data, 'data.stats.speed.value', adjustedPace);
    }

    //die type bounding for attributes
    let attributes = getProperty(this.data, 'data.attributes');
    for (let attribute in attributes) {
      let sides = getProperty(
        this.data,
        `data.attributes.${attribute}.die.sides`,
      );
      if (sides < 4 && sides !== 1) {
        setProperty(this.data, `data.attributes.${attribute}.die.sides`, 4);
      } else if (sides > 12) {
        setProperty(this.data, `data.attributes.${attribute}.die.sides`, 12);
      }
    }
  }

  /* -------------------------------------------- */
  /*  Getters
  /* -------------------------------------------- */
  get isWildcard(): boolean {
    if (this.data.type === 'vehicle') {
      return false;
    } else {
      return (
        getProperty(this.data, 'data.wildcard') ||
        this.data.type === 'character'
      );
    }
  }

  /* -------------------------------------------- */
  /*  Socket Listeners and Handlers
  /* -------------------------------------------- */

  /** @override */
  static async create(data, options = {}) {
    let link = false;

    if (data.type === 'character') {
      link = true;
    }
    data.token = data.token || {};
    mergeObject(
      data.token,
      {
        vision: true,
        actorLink: link,
      },
      { overwrite: false },
    );

    return super.create(data, options);
  }

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */
  rollAttribute(
    abilityId: string,
    options: IRollOptions = { event: null },
  ): Promise<Roll> | Roll {
    const label = CONFIG.SWADE.attributes[abilityId].long;
    let actorData = this.data as any;
    const abl = actorData.data.attributes[abilityId];
    let exp = '';
    let attrDie = `1d${abl.die.sides}x[${game.i18n.localize(label)}]`;
    let wildDie = `1d${abl['wild-die'].sides}x[${game.i18n.localize(
      'SWADE.WildDie',
    )}]`;
    if (this.isWildcard) {
      exp = `{${attrDie}, ${wildDie}}kh`;
    } else {
      exp = attrDie;
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

    //Conviction Modifier
    if (
      this.isWildcard &&
      game.settings.get('swade', 'enableConviction') &&
      getProperty(this.data, 'data.details.conviction.active')
    ) {
      rollParts.push('+1d6x');
    }

    const woundPenalties = this.calcWoundPenalties();
    if (woundPenalties !== 0) rollParts.push(woundPenalties);

    const fatiguePenalties = this.calcFatiguePenalties();
    if (fatiguePenalties !== 0) rollParts.push(fatiguePenalties);

    const statusPenalties = this.calcStatusPenalties();
    if (statusPenalties !== 0) rollParts.push(statusPenalties);

    if (options.suppressChat) {
      return new Roll(rollParts.join());
    }

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
      actor: this,
      allowGroup: true,
    });
  }

  rollSkill(
    skillId: string,
    options: IRollOptions = { event: null },
    tempSkill?: SwadeItem,
  ): Promise<Roll> | Roll {
    if (!options.rof) options.rof = 1;
    let skill;
    skill = this.items.find((i: SwadeItem) => i.id == skillId) as SwadeItem;
    if (tempSkill) {
      skill = tempSkill;
    }

    if (!skill) {
      return;
    }

    let rollParts = [];

    let skillData = getProperty(skill, 'data.data');

    if (options.rof > 1) {
      rollParts = this._handleRepeatingSKill(skill, options);
    } else {
      rollParts = this._handleSimpleSkill(skill, options);
    }

    let flavour = '';
    if (options.flavour) {
      flavour = ` - ${options.flavour}`;
    }

    if (options.suppressChat) {
      return new Roll(rollParts.join());
    }

    // Roll and return
    return SwadeDice.Roll({
      event: options.event,
      parts: rollParts,
      data: skillData,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${skill.name} ${game.i18n.localize(
        'SWADE.SkillTest',
      )}${flavour}`,
      title: `${skill.name} ${game.i18n.localize('SWADE.SkillTest')}`,
      actor: this,
      allowGroup: true,
    });
  }

  async makeUnskilledAttempt(
    options: IRollOptions = { event: null },
  ): Promise<any> {
    let tempSkill = new Item(
      {
        name: game.i18n.localize('SWADE.Unskilled'),
        type: 'skill',
        flags: {},
        data: {
          die: {
            sides: 4,
            modifier: '-2',
          },
          'wild-die': {
            sides: 6,
          },
        },
      },
      { temporary: true },
    ) as SwadeItem;

    return this.rollSkill('', options, tempSkill);
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

  /**
   * Reset the bennies of the Actor to their default value
   * @param displayToChat display a message to chat
   */
  async refreshBennies(displayToChat = true) {
    if (displayToChat) {
      let message = await renderTemplate(
        CONFIG.SWADE.bennies.templates.refresh,
        {
          target: this,
          speaker: game.user,
        },
      );
      let chatData = {
        content: message,
      };
      ChatMessage.create(chatData);
    }
    let actorData = this.data as any;
    await this.update({ 'data.bennies.value': actorData.data.bennies.max });
  }

  /**
   * Calculates the total Wound Penalties
   */
  calcWoundPenalties(): number {
    let retVal = 0;
    const wounds = parseInt(getProperty(this.data, 'data.wounds.value'));
    let ignoredWounds = parseInt(getProperty(this.data, 'data.wounds.ignored'));
    if (isNaN(ignoredWounds)) ignoredWounds = 0;

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
    return retVal * -1;
  }

  /**
   * Calculates the total Fatigue Penalties
   */
  calcFatiguePenalties(): number {
    let retVal = 0;
    const fatigue = parseInt(getProperty(this.data, 'data.fatigue.value'));
    if (!isNaN(fatigue)) retVal -= fatigue;
    return retVal;
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
        `1d${attr[name].die.sides}x` +
        (attr[name].die.modifier[0] != 0
          ? (['+', '-'].indexOf(attr[name].die.modifier[0]) < 0 ? '+' : '') +
            attr[name].die.modifier
          : '') +
        // wild-die
        (bAddWildDie && attr[name]['wild-die'].sides
          ? `+1d${attr[name]['wild-die'].sides}x`
          : '');
    } //fr
    return out;
  }

  /**
   * Calculates the correct armor value based on SWADE v5.5 and returns that value
   */
  calcArmor(): number {
    let totalArmorVal = 0;
    let armorList = this.data['items'].filter((i: SwadeItem) => {
      let isEquipped = getProperty(i.data, 'equipped');
      let coversTorso = getProperty(i.data, 'locations.torso');
      let isNaturalArmor = getProperty(i.data, 'isNaturalArmor');
      return i.type === 'armor' && isEquipped && !isNaturalArmor && coversTorso;
    });

    armorList = armorList.sort((a, b) => {
      const aValue = parseInt(a.data.armor);
      const bValue = parseInt(b.data.armor);
      return aValue + bValue;
    });

    const naturalArmors = this.data['items'].filter((i: SwadeItem) => {
      return i.type === 'armor' && getProperty(i.data, 'isNaturalArmor');
    });

    for (const armor of naturalArmors) {
      totalArmorVal += parseInt(armor.data.armor);
    }

    if (armorList.length === 0) {
      return totalArmorVal;
    } else if (armorList.length === 1) {
      totalArmorVal = parseInt(armorList[0].data.armor);
    } else {
      totalArmorVal =
        parseInt(armorList[0].data.armor) +
        Math.floor(parseInt(armorList[1].data.armor) / 2);
    }

    return totalArmorVal;
  }

  /**
   * Calculates the Toughness value and returns it, optionally with armor
   * @param includeArmor include armor in final value (true/false). Default is true
   */
  calcToughness(includeArmor = true): number {
    let retVal = 0;
    let vigor = getProperty(this.data, 'data.attributes.vigor.die.sides');
    let vigMod = parseInt(
      getProperty(this.data, 'data.attributes.vigor.die.modifier'),
    );
    let toughMod = parseInt(
      getProperty(this.data, 'data.stats.toughness.modifier'),
    );

    let size = parseInt(getProperty(this.data, 'data.stats.size'));
    retVal = Math.round(vigor / 2) + 2;
    retVal += size;
    retVal += toughMod;
    if (vigMod > 0) {
      retVal += Math.floor(vigMod / 2);
    }
    if (includeArmor) {
      retVal += this.calcArmor();
    }
    return retVal;
  }

  /**
   * Helper Function for Vehicle Actors, to roll Maneuevering checks
   */
  rollManeuverCheck(event: any = null) {
    let driverId = getProperty(this.data, 'data.driver.id') as string;
    let driver = game.actors.get(driverId) as SwadeActor;

    //Return early if no driver was found
    if (!driverId || !driver) {
      return;
    }

    //Get skillname
    let skillName = getProperty(this.data, 'data.driver.skill');
    if (skillName === '') {
      skillName = getProperty(this.data, 'data.driver.skillAlternative');
    }

    let handling = getProperty(this.data, 'data.handling');
    let wounds = this.calcWoundPenalties();
    let totalHandling: number | string;
    totalHandling = handling + wounds;

    // Calculate handling

    //Handling is capped at a certain penalty
    if (totalHandling < CONFIG.SWADE.vehicles.maxHandlingPenalty) {
      totalHandling = CONFIG.SWADE.vehicles.maxHandlingPenalty;
    }
    if (totalHandling > 0) {
      totalHandling = `+${totalHandling}`;
    }

    let options = {
      event: event,
      additionalMods: [totalHandling],
    };

    //Find the operating skill
    let skill = driver.items.find(
      (i) => i.type === 'skill' && i.name === skillName,
    ) as SwadeItem;

    if (skill) {
      driver.rollSkill(skill.id, options);
    } else {
      driver.makeUnskilledAttempt(options);
    }
  }

  private _handleSimpleSkill(skill: SwadeItem, options: IRollOptions) {
    let skillData = getProperty(skill, 'data.data');
    let exp = '';

    let wildDie = `1d${skillData['wild-die'].sides}x[${game.i18n.localize(
      'SWADE.WildDie',
    )}]`;
    let skillDie = `1d${skillData.die.sides}x[${skill.name}]`;
    if (this.isWildcard) {
      exp = `{${skillDie}, ${wildDie}}kh`;
    } else {
      exp = skillDie;
    }

    //Check and add Modifiers
    let rollParts = [exp] as any[];

    let itemMod = parseInt(skillData['die'].modifier);
    if (!isNaN(itemMod) && itemMod !== 0) {
      if (itemMod > 0) {
        rollParts.push('+');
      }
      rollParts.push(itemMod);
    }
    //Additional Mods
    if (options.additionalMods) {
      rollParts = rollParts.concat(options.additionalMods);
    }

    //Conviction Modifier
    if (
      this.isWildcard &&
      game.settings.get('swade', 'enableConviction') &&
      getProperty(this.data, 'data.details.conviction.active')
    ) {
      rollParts.push('+1d6x');
    }

    // Wound and Fatigue Penalties
    const woundPenalties = this.calcWoundPenalties();
    if (woundPenalties !== 0) rollParts.push(woundPenalties);

    const fatiguePenalties = this.calcFatiguePenalties();
    if (fatiguePenalties !== 0) rollParts.push(fatiguePenalties);

    const statusPenalties = this.calcStatusPenalties();
    if (statusPenalties !== 0) rollParts.push(statusPenalties);

    return rollParts;
  }

  private _handleRepeatingSKill(skill: SwadeItem, options: IRollOptions) {
    let skillData = getProperty(skill, 'data.data');
    let exp = '';
    let skillDice = [];

    let mods = [];

    //Conviction Modifier
    if (
      this.isWildcard &&
      game.settings.get('swade', 'enableConviction') &&
      getProperty(this.data, 'data.details.conviction.active')
    ) {
      mods.push('+1d6x');
    }

    // Wound and Fatigue Penalties
    const woundPenalties = this.calcWoundPenalties();
    if (woundPenalties !== 0) mods.push(woundPenalties);

    const fatiguePenalties = this.calcFatiguePenalties();
    if (fatiguePenalties !== 0) mods.push(fatiguePenalties);

    const statusPenalties = this.calcStatusPenalties();
    if (statusPenalties !== 0) mods.push(statusPenalties);

    let skillMod: string | number = parseInt(skillData['die'].modifier) || '';
    if (skillMod > 0) {
      skillMod = '+'.concat(skillMod.toString());
    }
    mods.push(skillMod);

    if (options.additionalMods) {
      mods = mods.concat(options.additionalMods);
    }
    for (let i = 0; i < options.rof; i++) {
      skillDice.push(
        `1d${skillData.die.sides}x[${skill.name}]${mods.join('')}`,
      );
    }

    let wildDie = `1d${skillData['wild-die'].sides}x[${game.i18n.localize(
      'SWADE.WildDie',
    )}]`;
    if (this.isWildcard) {
      exp = `{${skillDice.join(', ')}, ${wildDie}${mods.join('')}}kh${
        options.rof
      }`;
    } else {
      exp = `{${skillDice.join(', ')}}kh${options.rof}`;
    }
    return [exp];
  }
}
