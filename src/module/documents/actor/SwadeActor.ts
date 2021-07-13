import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import { ActorDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData';
import { BaseUser } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs';
import { ITraitRollModifier } from '../../../interfaces/additional';
import IRollOptions from '../../../interfaces/IRollOptions';
import { SWADE } from '../../config';
import SwadeDice from '../../dice';
import * as util from '../../util';
import SwadeItem from '../item/SwadeItem';
import SwadeCombatant from '../SwadeCombatant';
import { SwadeActorDataSource } from './actor-data-source';

declare global {
  interface DocumentClassConfig {
    Actor: typeof SwadeActor;
  }
}

/**
 * @noInheritDoc
 */
export default class SwadeActor extends Actor {
  /**
   * @returns true when the actor is a Wild Card
   */
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

  /**
   * @returns true when the actor has an arcane background or a special ability that grants powers.
   */
  get hasArcaneBackground(): boolean {
    const abEdges = this.itemTypes.edge.filter((i) =>
      getProperty(i, 'data.data.isArcaneBackground'),
    );
    const abAbilities = this.itemTypes.ability.filter((i) =>
      getProperty(i, 'data.data.grantsPowers'),
    );
    return abEdges.length > 0 || abAbilities.length > 0;
  }

  /**
   * @returns true when the actor is currently in combat and has drawn a joker
   */
  get hasJoker() {
    //return early if no combat is running
    if (!game?.combats?.active) return false;

    let combatant: SwadeCombatant | undefined;
    const hasToken = !!this.token;
    const isLinked = this.data.token.actorLink;
    if (isLinked || !hasToken) {
      //linked token
      combatant = game.combat?.combatants.find((c) => c.actor?.id === this.id);
    } else {
      //unlinked token
      combatant = game.combat?.combatants.find(
        (c) => c.token?.id === this.token?.id,
      );
    }
    return combatant?.hasJoker ?? false;
  }

  /**
   * @returns an object that contains booleans which denote the current status of the actor
   */
  get status() {
    return this.data.data.status;
  }

  /** @override */
  prepareBaseData() {
    if (this.data.type === 'vehicle') return;
    //auto calculations
    const shouldAutoCalcToughness = getProperty(
      this.data,
      'data.details.autoCalcToughness',
    ) as boolean;

    if (shouldAutoCalcToughness) {
      //if we calculate the toughness then we set the values to 0 beforehand so the active effects can be applies
      const toughnessKey = 'data.stats.toughness.value';
      const armorKey = 'data.stats.toughness.armor';
      this.data.data;
      setProperty(this.data, toughnessKey, 0);
      setProperty(this.data, armorKey, 0);
    }

    const shouldAutoCalcParry = getProperty(
      this.data,
      'data.details.autoCalcParry',
    ) as boolean;
    if (shouldAutoCalcParry) {
      //same procedure as with Toughness
      setProperty(this.data, 'data.stats.parry.value', 0);
    }
  }

  /** @override */
  prepareDerivedData() {
    //return early for Vehicles
    if (this.data.type === 'vehicle') return;

    //modify pace with wounds
    if (game.settings.get('swade', 'enableWoundPace')) {
      //bound maximum wound penalty to -3
      const wounds = Math.min(this.data.data.wounds.value, 3);
      const pace = this.data.data.stats.speed.value;
      //make sure the pace doesn't go below 1
      const adjustedPace = Math.max(pace - wounds, 1);
      this.data.data.stats.speed.adjusted = adjustedPace;
    }

    //die type bounding for attributes
    for (const attribute in this.data.data.attributes) {
      const key = `data.attributes.${attribute}.die.sides`;
      const sides = getProperty(this.data, key);
      if (sides < 4 && sides !== 1) {
        setProperty(this.data, key, 4);
      } else if (sides > 12) {
        setProperty(this.data, key, 12);
      }
    }

    // Toughness calculation
    const shouldAutoCalcToughness = this.data.data.details.autoCalcToughness;
    if (shouldAutoCalcToughness) {
      const adjustedTough = this.data.data.stats.toughness.value;
      const adjustedArmor = this.data.data.stats.toughness.armor;

      //add some sensible lower limits
      let completeArmor = this.calcArmor() + adjustedArmor;
      if (completeArmor < 0) completeArmor = 0;
      let completeTough =
        this.calcToughness(false) + adjustedTough + completeArmor;
      if (completeTough < 1) completeTough = 1;
      this.data.data.stats.toughness.value = completeTough;
      this.data.data.stats.toughness.armor = completeArmor;
    }

    const shouldAutoCalcParry = this.data.data.details.autoCalcParry;
    if (shouldAutoCalcParry) {
      const adjustedParry = this.data.data.stats.parry.value;
      let completeParry = this.calcParry() + adjustedParry;
      if (completeParry < 0) completeParry = 0;
      this.data.data.stats.parry.value = completeParry;
    }
  }

  rollAttribute(
    abilityId: keyof typeof SWADE.attributes,
    options: IRollOptions = {},
  ) {
    if (this.data.type === 'vehicle') return;
    if (options.rof && options.rof > 1) {
      ui.notifications?.warn(
        'Attribute Rolls with RoF greater than 1 are not currently supported',
      );
    }
    const label: string = SWADE.attributes[abilityId].long;
    const actorData = this.data;
    const abl = actorData.data.attributes[abilityId];
    const rolls = new Array<Roll>();

    const attrRoll = new Roll('');
    attrRoll.terms.push(
      this._buildTraitDie(abl.die.sides, game.i18n.localize(label)),
    );
    rolls.push(attrRoll);

    if (this.isWildcard) {
      const wildRoll = new Roll('');
      wildRoll.terms.push(this._buildWildDie(abl['wild-die'].sides));
      rolls.push(wildRoll);
    }

    const pool = PoolTerm.fromRolls(rolls);
    pool.modifiers.push('kh');

    const finalTerms = new Array<RollTerm>();
    finalTerms.push(pool);

    //Conviction Modifier
    const useConviction =
      this.isWildcard &&
      this.data.data.details.conviction.active &&
      game.settings.get('swade', 'enableConviction');

    if (useConviction) {
      const convDie = this._buildTraitDie(6, game.i18n.localize('SWADE.Conv'));
      finalTerms.push(new OperatorTerm({ operator: '+' }));
      finalTerms.push(convDie);
    }

    const rollMods = this._buildTraitRollModifiers(abl, options);
    rollMods.forEach((m) =>
      finalTerms.push(...Roll.parse(`${m.value}[${m.label}]`, {})),
    );

    const finalRoll = Roll.fromTerms(finalTerms);

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
    skillId: string | null,
    options: IRollOptions = { rof: 1 },
    tempSkill?: SwadeItem,
  ): Promise<Roll | null> | Roll {
    let skill: SwadeItem | undefined;
    skill = this.items.find((i) => i.id == skillId);
    if (tempSkill) {
      skill = tempSkill;
    }

    if (!skill) {
      return this.makeUnskilledAttempt(options);
    }

    const skillRoll = this._handleComplexSkill(skill, options);
    const roll = skillRoll[0];
    const rollMods = skillRoll[1];

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
      return roll;
    }

    // Roll and return
    return SwadeDice.Roll({
      roll: roll,
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

  async makeUnskilledAttempt(options: IRollOptions = {}) {
    const tempSkill = new SwadeItem({
      name: game.i18n.localize('SWADE.Unskilled'),
      type: 'skill',
      data: {
        die: {
          sides: 4,
          modifier: -2,
        },
        'wild-die': {
          sides: 6,
        },
      },
    });
    return this.rollSkill('', options, tempSkill);
  }

  async spendBenny() {
    if (this.data.type === 'vehicle') return;
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
      const benny = new Roll('1dB').evaluate({ async: false });
      game.dice3d.showForRoll(benny, game.user, true, null, false);
    }
  }

  async getBenny() {
    if (this.data.type === 'vehicle') return;
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
    if (this.data.type === 'vehicle') return;
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
  getRollShortcuts(): Record<string, number | string> {
    const out: Record<string, any> = {};
    //return early if the actor is a vehicle
    if (this.data.type === 'vehicle') return out;

    // Attributes
    const attributes = this.data.data.attributes;
    for (const [key, attribute] of Object.entries(attributes)) {
      const short = key.substring(0, 3);
      const name = game.i18n.localize(SWADE.attributes[key].long);
      const die = attribute.die.sides;
      const mod = attribute.die.modifier || 0;
      out[short] = `1d${die}x[${name}]${mod ? mod.signedString() : ''}`;
    }
    return out;
  }

  //@ts-ignore
  getRollData(): Record<string, number | string> {
    const retVal = this.getRollShortcuts();
    retVal['wounds'] = this.data.data.wounds.value || 0;

    if (this.data.type === 'vehicle') {
      retVal['topspeed'] = this.data.data.topspeed || 0;
    } else {
      const skills = this.itemTypes.skill;
      for (const skill of skills) {
        const skillDie = getProperty(skill.data, 'data.die.sides');
        let skillMod = getProperty(skill.data, 'data.die.modifier');
        skillMod = skillMod !== 0 ? parseInt(skillMod).signedString() : '';
        const name = skill.name!.slugify({ strict: true });
        retVal[name] = `1d${skillDie}x[${skill.name}]${skillMod}`;
      }
      retVal['fatigue'] = this.data.data.fatigue.value || 0;
      retVal['pace'] = this.data.data.stats.speed.value || 0;
    }
    return retVal;
  }

  /**
   * Calculates the correct armor value based on SWADE v5.5 and returns that value
   */
  calcArmor(): number {
    if (this.data.type === 'vehicle') return 0;
    const getArmorValue = (value: string | number): number => {
      return typeof value === 'number' ? value : parseInt(value, 10);
    };

    let totalArmorVal = 0;

    //get armor items and retieve their data
    const armors = this.itemTypes.armor.map((i) =>
      i.data.type === 'armor' ? i.data : null,
    );
    const armorList =
      armors.filter((i) => {
        const isEquipped = i?.data.equipped;
        const coversTorso = i?.data.locations.torso;
        const isNaturalArmor = i?.data.isNaturalArmor;
        return isEquipped && !isNaturalArmor && coversTorso;
      }) || [];
    armorList.sort((a, b) => {
      const aValue = getArmorValue(a!.data.armor);
      const bValue = getArmorValue(b!.data.armor);
      if (aValue < bValue) {
        return 1;
      }
      if (aValue > bValue) {
        return -1;
      }
      return 0;
    });

    if (armorList.length === 1) {
      totalArmorVal = getArmorValue(armorList[0]!.data.armor);
    } else if (armorList.length > 1) {
      totalArmorVal =
        getArmorValue(armorList[0]!.data.armor) +
        Math.floor(getArmorValue(armorList[1]!.data.armor) / 2);
    }

    const naturalArmors = armors.filter((i) => {
      const isEquipped = i!.data.equipped;
      const coversTorso = i!.data.locations.torso;
      const isNaturalArmor = i!.data.isNaturalArmor;
      return isNaturalArmor && isEquipped && coversTorso;
    });

    for (const armor of naturalArmors) {
      totalArmorVal += getArmorValue(armor!.data.armor);
    }

    return totalArmorVal;
  }

  /**
   * Calculates the Toughness value and returns it, optionally with armor
   * @param includeArmor include armor in final value (true/false). Default is true
   */
  calcToughness(includeArmor = true): number {
    if (this.data.type === 'vehicle') return 0;
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
      retVal += this.calcArmor() ?? 0;
    }
    if (retVal < 1) retVal = 1;
    return retVal;
  }

  /**
   * Calculates the maximum carry capacity based on the strength die and any adjustment steps
   */
  calcMaxCarryCapacity(): number | undefined {
    if (this.data.type === 'vehicle') return;
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
    if (this.data.type === 'vehicle') 0;
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
    const shields = this.items.filter((i) => i.type === 'shield');

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
  async rollManeuverCheck(event: any = null) {
    if (this.data.type !== 'vehicle') return;
    const driver = await this.getDriver();

    //Return early if no driver was found
    if (!driver) {
      return;
    }

    //Get skillname
    let skillName = this.data.data.driver.skill;
    if (skillName === '') {
      skillName = this.data.data.driver.skillAlternative;
    }

    const handling = this.data.data.handling;
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
      driver.rollSkill(skill.id!, options);
    } else {
      driver.makeUnskilledAttempt(options);
    }
  }

  async getDriver(): Promise<SwadeActor | undefined> {
    if (this.data.type !== 'vehicle') return;
    const driverId = this.data.data.driver.id;
    let driver: SwadeActor | undefined = undefined;
    if (driverId) {
      try {
        driver = ((await fromUuid(driverId)) as unknown) as SwadeActor;
      } catch (error) {
        ui.notifications?.error('The Driver could not be found!');
      }
    }
    return driver;
  }

  protected _handleComplexSkill(
    skill: SwadeItem,
    options: IRollOptions,
  ): [Roll, ITraitRollModifier[]] {
    if (!options.rof) options.rof = 1;
    if (skill.data.type !== 'skill') {
      throw new Error('Detected-non skill in skill roll construction');
    }
    const skillData = skill.data.data;

    const rolls = new Array<Roll>();

    //Add all necessary trait die
    for (let i = 0; i < options.rof; i++) {
      const skillRoll = new Roll('');
      const traitDie = this._buildTraitDie(skillData.die.sides, skill.name!);
      skillRoll.terms.push(traitDie);
      rolls.push(skillRoll);
    }

    //Add Wild Die
    if (this.isWildcard) {
      const wildRoll = new Roll('');
      wildRoll.terms.push(this._buildWildDie(skillData['wild-die'].sides));
      rolls.push(wildRoll);
    }

    const kh = options.rof > 1 ? `kh${options.rof}` : 'kh';
    const pool = PoolTerm.fromRolls(rolls);
    pool.modifiers.push(kh);

    //Conviction Modifier
    const useConviction =
      this.data.type !== 'vehicle' &&
      this.isWildcard &&
      this.data.data.details.conviction.active &&
      game.settings.get('swade', 'enableConviction');

    const finalTerms = new Array<RollTerm>();
    finalTerms.push(pool);

    const rollMods = this._buildTraitRollModifiers(skillData, options);
    rollMods.forEach((m) =>
      finalTerms.push(...Roll.parse(`${m.value}[${m.label}]`, {})),
    );

    if (useConviction) {
      const convDie = this._buildTraitDie(6, game.i18n.localize('SWADE.Conv'));
      finalTerms.push(new OperatorTerm({ operator: '+' }));
      finalTerms.push(convDie);
    }

    return [Roll.fromTerms(finalTerms), rollMods];
  }

  /**
   * @param sides number of sides of the die
   * @param flavor flavor of the die
   * @param modifiers modifiers to the die
   * @returns a Die instance that already has the exploding modifier by default
   */
  private _buildTraitDie(
    sides: number,
    flavor: string,
    modifiers: string[] = [],
  ): Die {
    return new Die({
      faces: sides,
      //@ts-ignore
      modifiers: ['x', ...modifiers],
      options: { flavor: flavor.replace(/[^a-zA-Z\d\s:\u00C0-\u00FF]/g, '') },
    });
  }

  private _buildWildDie(sides = 6, modifiers: string[] = []): Die {
    const die = new Die({
      faces: sides,
      //@ts-ignore
      modifiers: ['x', ...modifiers],
      options: {
        flavor: game.i18n.localize('SWADE.WildDie'),
      },
    });
    if (game.dice3d) {
      /**
       * TODO
       * This doesn't seem to currently work due to an apparent bug in the Foundry roll API
       * which removes property from the options object during the roll evaluation
       * I'll keep it here anyway so we have it ready when the bug is fixed
       */
      const colorPreset = game.user?.getFlag('swade', 'dsnWildDie') || 'none';
      if (colorPreset !== 'none') {
        die.options['colorset'] = colorPreset;
      }
    }
    return die;
  }

  private _buildTraitRollModifiers(
    data: any,
    options: IRollOptions,
  ): ITraitRollModifier[] {
    const mods: ITraitRollModifier[] = [];

    //Trait modifier
    const itemMod = parseInt(data.die.modifier);
    if (!isNaN(itemMod) && itemMod !== 0) {
      mods.push({
        label: game.i18n.localize('SWADE.TraitMod'),
        value: itemMod.signedString(),
      });
    }

    // Wounds
    const woundPenalties = this.calcWoundPenalties();
    if (woundPenalties !== 0)
      mods.push({
        label: game.i18n.localize('SWADE.Wounds'),
        value: woundPenalties.signedString(),
      });

    //Fatigue
    const fatiguePenalties = this.calcFatiguePenalties();
    if (fatiguePenalties !== 0)
      mods.push({
        label: game.i18n.localize('SWADE.Fatigue'),
        value: fatiguePenalties.signedString(),
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

    //Joker
    if (this.hasJoker) {
      mods.push({
        label: game.i18n.localize('SWADE.Joker'),
        value: '+2',
      });
    }

    //Status penalites
    if (this.data.type !== 'vehicle') {
      const isDistracted = this.data.data.status.isDistracted;
      const isEntangled = this.data.data.status.isEntangled;
      const entangled: ITraitRollModifier = {
        label: game.i18n.localize('SWADE.Entangled'),
        value: '-2',
      };
      const distracted: ITraitRollModifier = {
        label: game.i18n.localize('SWADE.Distr'),
        value: '-2',
      };
      if (isEntangled) {
        mods.push(entangled);
      } else if (isDistracted) {
        mods.push(distracted);
      }
    }

    return [...mods.filter((m) => m.value)];
  }

  async _preCreate(
    data: ActorDataConstructorData,
    options: DocumentModificationOptions,
    user: User,
  ) {
    await super._preCreate(data, options, user);

    const tokenData = mergeObject(
      this.data.token.toObject(),
      { actorLink: data.type === 'character', vision: true },
      { overwrite: false },
    );

    this.data.token.update(tokenData);

    //only do this if this is a PC with no prior skills
    if (data.type === 'character' && this.itemTypes.skill.length <= 0) {
      //Get list of core skills from settings
      const coreSkills = (game.settings.get('swade', 'coreSkills') as string)
        .split(',')
        .map((s) => s.trim());

      //Set compendium source
      const pack = game.settings.get('swade', 'coreSkillsCompendium') as string;

      const skillIndex: SwadeItem[] = (await game.packs
        ?.get(pack)
        ?.getDocuments()) as SwadeItem[];

      // extract skill data
      const skills = skillIndex
        .filter((i) => i.data.type === 'skill')
        .filter((i) => coreSkills.includes(i.data.name))
        .map((s) => s.data.toObject());

      // Create core skills not in compendium (for custom skill names entered by the user)
      for (const skillName of coreSkills) {
        if (!skillIndex.find((skill) => skillName === skill.data.name)) {
          skills.push({
            name: skillName,
            type: 'skill',
            img: 'systems/swade/assets/icons/skill.svg',
            //@ts-ignore
            data: {
              attribute: '',
            },
          });
        }
      }

      //set all the skills to be core skills
      //@ts-ignore
      skills.forEach((s) => (s.data.isCoreSkill = true));

      //Add the Untrained skill
      skills.push({
        name: 'Untrained',
        type: 'skill',
        img: 'systems/swade/assets/icons/skill.svg',
        //@ts-ignore
        data: {
          attribute: '',
          die: {
            sides: 4,
            modifier: -2,
          },
        },
      });
      //Add the items to the creation data

      this.data.update({ items: skills });
    }
  }

  async _preUpdate(
    changed: DeepPartial<ActorDataConstructorData> & Record<string, unknown>,
    options: DocumentModificationOptions,
    user: BaseUser,
  ) {
    await super._preUpdate(changed, options, user);
    //wildcards will be linked, extras unlinked
    if (
      game.settings.get('swade', 'autoLinkWildcards') &&
      hasProperty(changed, 'data.wildcard')
    ) {
      //@ts-ignore
      this.data.token.update({ actorlink: changed.data.wildcard });
    }
  }

  async _onUpdate(
    changed: DeepPartial<SwadeActorDataSource> & Record<string, unknown>,
    options: DocumentModificationOptions,
    user: string,
  ) {
    super._onUpdate(changed, options, user);
    if (this.data.type === 'npc') {
      //@ts-ignore
      ui.actors?.render(true);
    }
    if (hasProperty(changed, 'data.bennies') && this.hasPlayerOwner) {
      ui.players?.render(true);
    }
  }
}
