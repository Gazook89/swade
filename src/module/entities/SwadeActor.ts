import SwadeDice from '../dice';
import IRollOptions from '../../interfaces/IRollOptions';
import SwadeItem from './SwadeItem';
import * as util from '../util';
import { SWADE } from '../config';
import { SysActorData } from '../../interfaces/actor-data';

/**
 * @noInheritDoc
 */
export default class SwadeActor extends Actor<SysActorData, SwadeItem> {
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

  get hasArcaneBackground(): boolean {
    const abEdges = this.items.filter(
      (i: SwadeItem) =>
        i.type === 'edge' && i.data.data['isArcaneBackground'] === true,
    );
    const abAbilities = this.items.filter(
      (i: SwadeItem) =>
        i.type === 'ability' && i.data.data['grantsPowers'] === true,
    );
    return abEdges.length > 0 || abAbilities.length > 0;
  }

  /**
   * @override
   * Extends data from base Actor class
   */
  prepareData() {
    //FIXME Check this for 0.8.X
    //@ts-ignore
    this.data = duplicate(this['_data']);
    if (!this.data.img) this.data.img = CONST.DEFAULT_TOKEN;
    if (!this.data.name) this.data.name = 'New ' + this.entity;
    this.prepareEmbeddedEntities();
    this.prepareBaseData();
    this.applyActiveEffects();
    this.prepareDerivedData();
  }

  /**
   * @override
   */
  prepareBaseData() {
    //auto calculations
    const shouldAutoCalcToughness =
      getProperty(this.data, 'data.details.autoCalcToughness') &&
      this.data.type !== 'vehicle';

    if (shouldAutoCalcToughness) {
      //if we calculate the toughness then we set the values to 0 beforehand so the active effects can be applies
      const toughnessKey = 'data.stats.toughness.value';
      const armorKey = 'data.stats.toughness.armor';
      setProperty(this.data, toughnessKey, 0);
      setProperty(this.data, armorKey, 0);
    }

    const shouldAutoCalcParry =
      getProperty(this.data, 'data.details.autoCalcParry') &&
      this.data.type !== 'vehicle';
    if (shouldAutoCalcParry) {
      //same procedure as with Toughness
      setProperty(this.data, 'data.stats.parry.value', 0);
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
      const wounds = parseInt(getProperty(this.data, 'data.wounds.value'));
      const pace = parseInt(getProperty(this.data, 'data.stats.speed.value'));
      //bound maximum wound penalty to -3
      const woundsToUse = Math.min(wounds, 3);

      let adjustedPace = pace - woundsToUse;
      if (adjustedPace < 1) adjustedPace = 1;

      setProperty(this.data, 'data.stats.speed.value', adjustedPace);
    }

    //die type bounding for attributes
    const attributes = getProperty(this.data, 'data.attributes');
    for (const attribute in attributes) {
      const sides = getProperty(
        this.data,
        `data.attributes.${attribute}.die.sides`,
      );
      if (sides < 4 && sides !== 1) {
        setProperty(this.data, `data.attributes.${attribute}.die.sides`, 4);
      } else if (sides > 12) {
        setProperty(this.data, `data.attributes.${attribute}.die.sides`, 12);
      }
    }

    // Toughness calculation
    const shouldAutoCalcToughness = getProperty(
      this.data,
      'data.details.autoCalcToughness',
    );

    if (shouldAutoCalcToughness) {
      const toughKey = 'data.stats.toughness.value';
      const armorKey = 'data.stats.toughness.armor';
      const adjustedTough = getProperty(this.data, toughKey);
      const adjustedArmor = getProperty(this.data, armorKey);

      //add some sensible lower limits
      let completeArmor = this.calcArmor() + adjustedArmor;
      if (completeArmor < 0) completeArmor = 0;
      let completeTough =
        this.calcToughness(false) + adjustedTough + completeArmor;
      if (completeTough < 1) completeTough = 1;

      setProperty(this.data, toughKey, completeTough);
      setProperty(this.data, armorKey, completeArmor);
    }

    const shouldAutoCalcParry = getProperty(
      this.data,
      'data.details.autoCalcParry',
    );

    if (shouldAutoCalcParry) {
      const parryKey = 'data.stats.parry.value';
      const adjustedParry = getProperty(this.data, parryKey);
      let completeParry = this.calcParry() + adjustedParry;
      if (completeParry < 0) completeParry = 0;
      setProperty(this.data, parryKey, completeParry);
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

  rollAttribute(
    abilityId: string,
    options: IRollOptions = { event: null },
  ): Promise<Roll> | Roll {
    const label = SWADE.attributes[abilityId].long;
    const actorData = this.data as any;
    const abl = actorData.data.attributes[abilityId];
    let finalRoll = new Roll('');
    const rollMods = this._buildTraitRollModifiers(abl, options);

    const attrRoll = new Roll('');
    attrRoll.terms.push(
      this._buildTraitDie(abl.die.sides, game.i18n.localize(label)),
    );
    if (rollMods.length !== 0) {
      rollMods.forEach((m) => attrRoll.terms.push(m.value));
    }

    //If the Actor is a wildcard the build a dicepool, otherwise build a Roll
    if (this.isWildcard) {
      const wildRoll = new Roll('');
      wildRoll.terms.push(this._buildWildDie(abl['wild-die'].sides));
      const wildCardPool = new DicePool({
        rolls: [attrRoll, wildRoll],
        modifiers: ['kh'],
      });
      if (rollMods.length !== 0) {
        rollMods.forEach((m) => wildRoll.terms.push(m.value));
      }
      finalRoll.terms.push(wildCardPool);
    } else {
      finalRoll = attrRoll;
    }

    if (options.suppressChat) {
      return finalRoll;
    }

    //Build Flavour
    let flavour = '';
    if (rollMods.length !== 0) {
      rollMods.forEach((v) => {
        flavour = flavour.concat(`<br>${v.label}: ${v.value}`);
      });
    }

    // Roll and return
    return SwadeDice.Roll({
      roll: finalRoll,
      data: actorData,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${game.i18n.localize(label)} ${game.i18n.localize(
        'SWADE.AttributeTest',
      )}${flavour}`,
      title: `${game.i18n.localize(label)} ${game.i18n.localize(
        'SWADE.AttributeTest',
      )}`,
      actor: this,
      allowGroup: true,
      flags: { swade: { colorMessage: true } },
    });
  }

  rollSkill(
    skillId: string,
    options: IRollOptions = { event: null },
    tempSkill?: SwadeItem,
  ): Promise<Roll> | Roll {
    if (!options.rof) options.rof = 1;
    let skill: SwadeItem;
    skill = this.items.find((i: SwadeItem) => i.id == skillId) as SwadeItem;
    if (tempSkill) {
      skill = tempSkill;
    }

    if (!skill) {
      return;
    }

    const skillData = getProperty(skill, 'data.data');
    let skillRoll = null;
    let rollMods = [];

    if (options.rof && options.rof > 1) {
      skillRoll = this._handleComplexSkill(skill, options);
      rollMods = skillRoll[1];
    } else {
      skillRoll = this._handleSimpleSkill(skill, options);
      rollMods = skillRoll[1];
    }

    //Build Flavour
    let flavour = '';
    if (options.flavour) {
      flavour = ` - ${options.flavour}`;
    }
    if (rollMods.length !== 0) {
      rollMods.forEach((v) => {
        flavour = flavour.concat(`<br>${v.label}: ${v.value}`);
      });
    }

    if (options.suppressChat) {
      return skillRoll[0];
    }

    // Roll and return
    return SwadeDice.Roll({
      roll: skillRoll[0],
      data: skillData,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${skill.name} ${game.i18n.localize(
        'SWADE.SkillTest',
      )}${flavour}`,
      title: `${skill.name} ${game.i18n.localize('SWADE.SkillTest')}`,
      actor: this,
      allowGroup: true,
      flags: { swade: { colorMessage: true } },
    });
  }

  async makeUnskilledAttempt(
    options: IRollOptions = { event: null },
  ): Promise<Roll> {
    const tempSkill = new Item(
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
    const currentBennies = getProperty(this.data, 'data.bennies.value');
    //return early if there no bennies to spend
    if (currentBennies < 1) return;
    if (game.settings.get('swade', 'notifyBennies')) {
      const message = await renderTemplate(SWADE.bennies.templates.spend, {
        target: this,
        speaker: game.user,
      });
      const chatData = {
        content: message,
      };
      ChatMessage.create(chatData);
    }
    await this.update({ 'data.bennies.value': currentBennies - 1 });
    if (!!game.dice3d && (await util.shouldShowBennyAnimation())) {
      const benny = new Roll('1dB').roll();
      game.dice3d.showForRoll(benny, game.user, true, null, false);
    }
  }

  async getBenny() {
    if (game.settings.get('swade', 'notifyBennies')) {
      const message = await renderTemplate(SWADE.bennies.templates.add, {
        target: this,
        speaker: game.user,
      });
      const chatData = {
        content: message,
      };
      ChatMessage.create(chatData);
    }
    const actorData = this.data as any;
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
      const message = await renderTemplate(SWADE.bennies.templates.refresh, {
        target: this,
        speaker: game.user,
      });
      const chatData = {
        content: message,
      };
      ChatMessage.create(chatData);
    }
    if (this.data.type === 'vehicle') return;
    await this.update({ 'data.bennies.value': this.data.data.bennies.max });
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
    const isDistracted = getProperty(this.data, 'data.status.isDistracted');
    const isEntangled = getProperty(this.data, 'data.status.isEntangled');
    if (isDistracted || isEntangled) {
      retVal -= 2;
    }
    return retVal;
  }

  /**
   * Function for shorcut roll in item (@str + 1d6)
   * return something like : {agi: "1d8x8+1", sma: "1d6x6", spi: "1d6x6", str: "1d6x6-1", vig: "1d6x6"}
   */
  getRollShortcuts() {
    const out = {};
    //return early if the actor is a vehicle
    if (this.data.type === 'vehicle') return out;

    // Attributes
    const attributes = this.data.data.attributes;
    for (const name in attributes) {
      const attribute = attributes[name];
      const short = name.substring(0, 3);
      const die: number = attribute.die.sides;
      const mod: number = attribute.die.modifier || 0;
      out[short] = `(1d${die}x${mod !== 0 ? mod.signedString() : ''})`;
    }
    return out;
  }

  /**
   * @override
   */
  getRollData(): any {
    const retVal = this.getRollShortcuts();
    const skills = this.items.filter((i: Item) => i.type === 'skill') as Item[];
    for (const skill of skills) {
      const skillDie = getProperty(skill.data, 'data.die.sides');
      let skillMod = getProperty(skill.data, 'data.die.modifier');
      skillMod = skillMod !== 0 ? parseInt(skillMod).signedString() : '';
      retVal[
        skill.name.slugify({ strict: true })
      ] = `1d${skillDie}x${skillMod}`;
    }
    retVal['wounds'] = getProperty(this.data, 'data.wounds.value') || 0;
    retVal['fatigue'] = getProperty(this.data, 'data.fatigue.value') || 0;
    return retVal;
  }

  /**
   * Calculates the correct armor value based on SWADE v5.5 and returns that value
   */
  calcArmor(): number {
    let totalArmorVal = 0;

    const armors = this.items.filter((i) => i.type === 'armor');

    const armorList = armors.filter((i) => {
      const isEquipped = getProperty(i.data, 'equipped') as boolean;
      const coversTorso = getProperty(i.data, 'locations.torso') as boolean;
      const isNaturalArmor = getProperty(i.data, 'isNaturalArmor') as boolean;
      return isEquipped && !isNaturalArmor && coversTorso;
    });

    armorList.sort((a, b) => {
      const aValue = parseInt(a.data.armor, 10);
      const bValue = parseInt(b.data.armor, 10);
      if (aValue < bValue) {
        return 1;
      }
      if (aValue > bValue) {
        return -1;
      }
      return 0;
    });

    if (armorList.length === 1) {
      totalArmorVal = parseInt(armorList[0].data.armor);
    } else if (armorList.length > 1) {
      totalArmorVal =
        parseInt(armorList[0].data.armor, 10) +
        Math.floor(parseInt(armorList[1].data.armor, 10) / 2);
    }

    const naturalArmors = this.data.items.filter((i) => {
      const isArmor = i.type === 'armor';
      const isNaturalArmor = getProperty(i.data, 'isNaturalArmor') as boolean;
      const isEquipped = getProperty(i.data, 'equipped') as boolean;
      const isTorso = getProperty(i.data, 'locations.torso') as boolean;
      return isArmor && isNaturalArmor && isEquipped && isTorso;
    });

    for (const armor of naturalArmors) {
      totalArmorVal += parseInt(armor.data.armor, 10);
    }

    return totalArmorVal;
  }

  /**
   * Calculates the Toughness value and returns it, optionally with armor
   * @param includeArmor include armor in final value (true/false). Default is true
   */
  calcToughness(includeArmor = true): number {
    let retVal = 0;
    const vigor = getProperty(this.data, 'data.attributes.vigor.die.sides');
    const vigMod = parseInt(
      getProperty(this.data, 'data.attributes.vigor.die.modifier'),
    );
    const toughMod = parseInt(
      getProperty(this.data, 'data.stats.toughness.modifier'),
    );

    retVal = Math.round(vigor / 2) + 2;

    const size = parseInt(getProperty(this.data, 'data.stats.size')) || 0;
    retVal += size;

    retVal += toughMod;
    if (vigMod > 0) {
      retVal += Math.floor(vigMod / 2);
    }
    if (includeArmor) {
      retVal += this.calcArmor();
    }
    if (retVal < 1) retVal = 1;
    return retVal;
  }

  /**
   * Calculates the maximum carry capacity based on the strength die and any adjustment steps
   */
  calcMaxCarryCapacity(): number {
    const strengthDie = getProperty(this.data, 'data.attributes.strength.die');

    let stepAdjust =
      getProperty(this.data, 'data.attributes.strength.encumbranceSteps') * 2;

    if (stepAdjust < 0) stepAdjust = 0;

    const encumbDie = strengthDie.sides + stepAdjust;

    if (encumbDie > 12) encumbDie > 12;

    let capacity = 20 + 10 * (encumbDie - 4);

    if (strengthDie.modifier > 0) {
      capacity = capacity + 20 * strengthDie.modifier;
    }

    return capacity;
  }

  calcParry(): number {
    let parryTotal = 0;
    const parryBase = game.settings.get('swade', 'parryBaseSkill') as string;
    const parryBaseSkill = this.items.find(
      (i: Item) => i.type === 'skill' && i.name === parryBase,
    ) as Item;

    const skillDie: number =
      getProperty(parryBaseSkill, 'data.data.die.sides') || 0;

    //base parry calculation
    parryTotal = skillDie / 2 + 2;

    //add modifier if the skill die is 12
    if (skillDie >= 12) {
      const skillMod: number =
        getProperty(parryBaseSkill, 'data.data.die.modifier') || 0;
      parryTotal += Math.floor(skillMod / 2);
    }

    //add shields
    const shields = this.items.filter(
      (i: Item) => i.type === 'shield',
    ) as Item[];

    for (const shield of shields) {
      const isEquipped = getProperty(shield.data, 'data.equipped');

      if (isEquipped) {
        parryTotal += getProperty(shield.data, 'data.parry');
      }
    }
    return parryTotal;
  }

  /**
   * Helper Function for Vehicle Actors, to roll Maneuevering checks
   */
  rollManeuverCheck(event: any = null) {
    const driverId = getProperty(this.data, 'data.driver.id') as string;
    const driver = game.actors.get(driverId) as SwadeActor;

    //Return early if no driver was found
    if (!driverId || !driver) {
      return;
    }

    //Get skillname
    let skillName = getProperty(this.data, 'data.driver.skill');
    if (skillName === '') {
      skillName = getProperty(this.data, 'data.driver.skillAlternative');
    }

    const handling = getProperty(this.data, 'data.handling');
    const wounds = this.calcWoundPenalties();
    let totalHandling: number | string;
    totalHandling = handling + wounds;

    // Calculate handling

    //Handling is capped at a certain penalty
    if (totalHandling < SWADE.vehicles.maxHandlingPenalty) {
      totalHandling = SWADE.vehicles.maxHandlingPenalty;
    }
    if (totalHandling > 0) {
      totalHandling = `+${totalHandling}`;
    }

    const options = {
      event: event,
      additionalMods: [totalHandling],
    };

    //Find the operating skill
    const skill = driver.items.find(
      (i) => i.type === 'skill' && i.name === skillName,
    ) as SwadeItem;

    if (skill) {
      driver.rollSkill(skill.id, options);
    } else {
      driver.makeUnskilledAttempt(options);
    }
  }

  protected _handleSimpleSkill(
    skill: SwadeItem,
    options: IRollOptions,
  ): [Roll, any[]] {
    const skillData = getProperty(skill, 'data.data');

    const skillRoll = new Roll('');
    skillRoll.terms.push(this._buildTraitDie(skillData.die.sides, skill.name));

    if (this.isWildcard) {
      return this._handleComplexSkill(skill, options);
    } else {
      const rollMods = this._buildTraitRollModifiers(skillData, options);
      rollMods.forEach((m) => skillRoll.terms.push(m.value));
      return [skillRoll, rollMods];
    }
  }

  protected _handleComplexSkill(
    skill: SwadeItem,
    options: IRollOptions,
  ): [Roll, any[]] {
    if (!options.rof) options.rof = 1;
    const skillData = getProperty(skill, 'data.data');

    const rolls: Roll[] = [];
    const rollMods = this._buildTraitRollModifiers(skillData, options);
    for (let i = 0; i < options.rof; i++) {
      const skillRoll = new Roll('');
      const traitDie = this._buildTraitDie(skillData.die.sides, skill.name);
      skillRoll.terms.push(traitDie);

      rollMods.forEach((m) => skillRoll.terms.push(m.value));
      rolls.push(skillRoll);
    }

    const kh = options.rof > 1 ? `kh${options.rof}` : 'kh';

    const dicePool = new DicePool({
      rolls: rolls,
      modifiers: [kh],
    });

    if (this.isWildcard) {
      const wildRoll = new Roll('');
      wildRoll.terms.push(this._buildWildDie(skillData['wild-die'].sides));
      rollMods.forEach((m) => wildRoll.terms.push(m.value));
      dicePool.rolls.push(wildRoll);
    }

    //Conviction Modifier
    if (
      this.isWildcard &&
      game.settings.get('swade', 'enableConviction') &&
      getProperty(this.data, 'data.details.conviction.active')
    ) {
      for (const r of dicePool.rolls) {
        if (r instanceof Roll) {
          r.terms.push('+');
          r.terms.push(
            this._buildTraitDie(6, game.i18n.localize('SWADE.Conv')),
          );
        }
      }
    }

    const finalRoll = new Roll('');
    finalRoll.terms.push(dicePool);

    return [finalRoll, rollMods];
  }

  private _buildTraitDie(
    sides: number,
    flavor: string,
    modifiers: string[] = [],
  ): Die {
    return new Die({
      faces: sides,
      modifiers: ['x', ...modifiers],
      options: { flavor: flavor.replace(/[^a-zA-Z\d\s:\u00C0-\u00FF]/g, '') },
    });
  }

  private _buildWildDie(sides = 6, modifiers: string[] = []): Die {
    const die = new Die({
      faces: sides,
      modifiers: ['x', ...modifiers],
      options: {
        flavor: game.i18n
          .localize('SWADE.WildDie')
          .replace(/[^a-zA-Z\d\s:\u00C0-\u00FF]/g, ''),
      },
    });
    if (game.dice3d) {
      /**
       * TODO
       * This doesn't seem to currently work due to an apparent bug in the Foundry roll API
       * which removes property from the options object during the roll evaluation
       * I'll keep it here anyway so we have it ready when the bug is fixed
       */
      const colorPreset = game.user.getFlag('swade', 'dsnWildDie') || 'none';
      if (colorPreset !== 'none') {
        die.options['colorset'] = colorPreset;
      }
    }
    return die;
  }

  private _buildTraitRollModifiers(data: any, options: IRollOptions) {
    const mods = [];

    //Skill modifier
    const itemMod = parseInt(data.die.modifier);
    if (!isNaN(itemMod) && itemMod !== 0) {
      mods.push({
        label: game.i18n.localize('SWADE.TraitMod'),
        value: itemMod.signedString(),
      });
    }

    // Wound and Fatigue Penalties
    const woundPenalties = this.calcWoundPenalties();
    if (woundPenalties !== 0)
      mods.push({
        label: game.i18n.localize('SWADE.Wounds'),
        value: woundPenalties.signedString(),
      });

    const fatiguePenalties = this.calcFatiguePenalties();
    if (fatiguePenalties !== 0)
      mods.push({
        label: game.i18n.localize('SWADE.Fatigue'),
        value: fatiguePenalties.signedString(),
      });

    const statusPenalties = this.calcStatusPenalties();
    if (statusPenalties !== 0)
      mods.push({
        label: game.i18n.localize('SWADE.Status'),
        value: statusPenalties.signedString(),
      });

    //Additional Mods
    if (options.additionalMods) {
      options.additionalMods.forEach((v) => {
        let value;
        if (typeof v === 'string') {
          value = v;
        } else {
          value = v.signedString();
        }
        mods.push({ label: game.i18n.localize('SWADE.Addi'), value });
      });
    }
    return [...mods.filter((m) => m.value)];
  }
}
