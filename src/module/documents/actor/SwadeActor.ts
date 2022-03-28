import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import { ActorDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData';
import { BaseUser } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs';
import { ItemMetadata, StatusEffect } from '../../../globals';
import { TraitRollModifier } from '../../../interfaces/additional';
import IRollOptions from '../../../interfaces/IRollOptions';
import { SWADE } from '../../config';
import * as util from '../../util';
import SwadeItem from '../item/SwadeItem';
import SwadeCombatant from '../SwadeCombatant';
import { SwadeActorDataSource, TraitDie } from './actor-data-source';

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
      return this.data.data.wildcard || this.data.type === 'character';
    }
  }

  /** @returns true when the actor has an arcane background or a special ability that grants powers. */
  get hasArcaneBackground(): boolean {
    const abEdge = this.itemTypes.edge.find(
      (i) => i.data.type === 'edge' && i.data.data.isArcaneBackground,
    );
    const abAbility = this.itemTypes.ability.find(
      (i) => i.data.type === 'ability' && i.data.data.grantsPowers,
    );
    return !!abEdge || !!abAbility;
  }

  /** @returns true when the actor is currently in combat and has drawn a joker */
  get hasJoker(): boolean {
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

  get bennies(): number {
    if (this.data.type === 'vehicle') return 0;
    return this.data.data.bennies.value;
  }

  /** @returns an object that contains booleans which denote the current status of the actor */
  get status() {
    return this.data.data.status;
  }

  get armorPerLocation(): ArmorPerLocation {
    return {
      head: this._getArmorForLocation(CONFIG.SWADE.CONST.ARMOR_LOCATIONS.Head),
      torso: this._getArmorForLocation(
        CONFIG.SWADE.CONST.ARMOR_LOCATIONS.Torso,
      ),
      arms: this._getArmorForLocation(CONFIG.SWADE.CONST.ARMOR_LOCATIONS.Arms),
      legs: this._getArmorForLocation(CONFIG.SWADE.CONST.ARMOR_LOCATIONS.Legs),
    };
  }

  /**
   * Returns whether this character is currently encumbered, factoring in whether the rule is even enforced
   */
  get isEncumbered(): boolean {
    const applyEncumbrance = game.settings.get('swade', 'applyEncumbrance');
    if (!applyEncumbrance) return false;
    if (this.data.type === 'vehicle') {
      return false;
    }
    const encumbrance = this.data.data.details.encumbrance;
    return encumbrance.value > encumbrance.max;
  }

  /** @override */
  prepareBaseData() {
    if (this.data.type === 'vehicle') return;
    //auto calculations
    if (this.data.data.details.autoCalcToughness) {
      //if we calculate the toughness then we set the values to 0 beforehand so the active effects can be applies
      this.data.data.stats.toughness.value = 0;
      this.data.data.stats.toughness.armor = 0;
    }

    if (this.data.data.details.autoCalcParry) {
      //same procedure as with Toughness
      this.data.data.stats.parry.value = 0;
    }
  }

  /** @override */
  prepareDerivedData() {
    this._filterOverrides();
    //return early for Vehicles
    if (this.data.type === 'vehicle') return;

    //die type bounding for attributes
    for (const attribute of Object.values(this.data.data.attributes)) {
      attribute.die = this._boundTraitDie(attribute.die);
    }

    //handle carry capacity
    this.data.data.details.encumbrance = {
      max: this.calcMaxCarryCapacity(),
      value: this.calcInventoryWeight(),
    };

    let pace = this.data.data.stats.speed.value;

    //subtract encumbrance, if necessary
    if (this.isEncumbered) {
      pace -= 2;
    }

    //modify pace with wounds
    if (game.settings.get('swade', 'enableWoundPace')) {
      //bound maximum wound penalty to -3
      const wounds = Math.min(this.data.data.wounds.value, 3);
      //subtract wounds
      pace -= wounds;
    }

    //make sure the pace doesn't go below 1
    this.data.data.stats.speed.adjusted = Math.max(pace, 1);

    //set scale
    this.data.data.stats.scale = this.calcScale(this.data.data.stats.size);

    // Toughness calculation
    const shouldAutoCalcToughness = this.data.data.details.autoCalcToughness;
    if (shouldAutoCalcToughness) {
      const adjustedTough = this.data.data.stats.toughness.value;
      const adjustedArmor = this.data.data.stats.toughness.armor;

      //add some sensible lower limits
      const finalArmor = Math.max(this.calcArmor() + adjustedArmor, 0);
      const finalTough = Math.max(
        this.calcToughness(false) + adjustedTough + finalArmor,
        1,
      );
      this.data.data.stats.toughness.value = finalTough;
      this.data.data.stats.toughness.armor = finalArmor;
    }

    const shouldAutoCalcParry = this.data.data.details.autoCalcParry;
    if (shouldAutoCalcParry) {
      const adjustedParry = this.data.data.stats.parry.value;
      const completeParry = Math.max(this.calcParry() + adjustedParry, 0);
      this.data.data.stats.parry.value = completeParry;
    }
  }

  rollAttribute(attribute: Attribute, options: IRollOptions = {}) {
    if (this.data.type === 'vehicle') return;
    if (options.rof && options.rof > 1) {
      ui.notifications.warn(
        'Attribute Rolls with RoF greater than 1 are not currently supported',
      );
    }
    const label: string = SWADE.attributes[attribute].long;
    const actorData = this.data;
    const abl = actorData.data.attributes[attribute];
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

    const basePool = PoolTerm.fromRolls(rolls);
    basePool.modifiers.push('kh');

    const modifiers = this._buildTraitRollModifiers(
      abl,
      options,
      game.i18n.localize(label),
    );

    //add encumbrance penalty if necessary
    if (attribute === 'agility' && this.isEncumbered) {
      modifiers.push({
        label: game.i18n.localize('SWADE.Encumbered'),
        value: -2,
      });
    }

    const roll = Roll.fromTerms([basePool]);

    /**
     * A hook event that is fired before an attribute is rolled, giving the opportunity to programmatically adjust a roll and its modifiers
     * @function rollAttribute
     * @memberof hookEvents
     * @param {Actor} actor                     The actor that rolls the attribute
     * @param {String} attribute                The name of the attribute, in lower case
     * @param {Roll} roll                       The built base roll, without any modifiers
     * @param {TraitRollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    Hooks.call('swadeRollAttribute', this, attribute, roll, modifiers, options);

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
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${game.i18n.localize(label)} ${game.i18n.localize(
        'SWADE.AttributeTest',
      )}`,
      title: `${game.i18n.localize(label)} ${game.i18n.localize(
        'SWADE.AttributeTest',
      )}`,
      actor: this,
      allowGroup: true,
      flags: { swade: { colorMessage: true } },
    });
  }

  rollSkill(
    skillId: string | null | undefined,
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
    const modifiers = skillRoll[1];

    //Build Flavour
    let flavour = '';
    if (options.flavour) {
      flavour = ` - ${options.flavour}`;
    }

    /**
     * A hook event that is fired before a skill is rolled, giving the opportunity to programmatically adjust a roll and its modifiers
     * @function rollSkill
     * @memberof hookEvents
     * @param {Actor} actor                     The actor that rolls the skill
     * @param {Item} skill                      The Skill item that is being rolled
     * @param {Roll} roll                       The built base roll, without any modifiers
     * @param {TraitRollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    Hooks.call('swadeRollSkill', this, skill, roll, modifiers, options);

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
          modifier: 0,
        },
        'wild-die': {
          sides: 6,
        },
      },
    });
    const modifier: TraitRollModifier = {
      label: game.i18n.localize('SWADE.Unskilled'),
      value: -2,
    };
    if (options.additionalMods) {
      options.additionalMods.push(modifier);
    } else {
      options.additionalMods = [modifier];
    }
    return this.rollSkill(null, options, tempSkill);
  }

  async makeArcaneDeviceSkillRoll(options: IRollOptions = {}, arcaneSkillDie) {
    const tempSkill = new SwadeItem({
      name: game.i18n.localize('SWADE.ArcaneSkill'),
      type: 'skill',
      data: {
        die: arcaneSkillDie,
        'wild-die': {
          sides: 6,
        },
      },
    });
    return this.rollSkill(null, options, tempSkill);
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
      const chatData = { content: message };
      ChatMessage.create(chatData);
    }
    await this.update({ 'data.bennies.value': currentBennies - 1 });
    if (game.settings.get('swade', 'hardChoices')) {
      const gms = game.users!.filter((u) => u.isGM && u.active);
      for await (const gm of gms) {
        gm.getBenny();
      }
    }
    if (!!game.dice3d && (await util.shouldShowBennyAnimation())) {
      game.dice3d.showForRoll(
        await new Roll('1dB').evaluate({ async: true }),
        game.user!,
        true,
        null,
        false,
      );
    }
  }

  async getBenny() {
    if (this.data.type === 'vehicle') return;
    const combatant = this.token?.combatant;
    const notHiddenNPC =
      !combatant?.isNPC || (combatant?.isNPC && !combatant?.hidden);
    if (game.settings.get('swade', 'notifyBennies') && notHiddenNPC) {
      const message = await renderTemplate(SWADE.bennies.templates.add, {
        target: this,
        speaker: game.user,
      });
      const chatData = {
        content: message,
      };
      ChatMessage.create(chatData);
    }
    await this.update({
      'data.bennies.value': this.data.data.bennies.value + 1,
    });
  }

  async toggleActiveEffect(
    effectData: StatusEffect,
    options: { overlay?: boolean; active?: boolean } = { overlay: false },
  ) {
    //get the active tokens
    const tokens = this.getActiveTokens();
    //if there's tokens, iterate over them to toggle the effect directly
    if (tokens.length > 0) {
      for (const token of tokens) {
        //@ts-ignore TokenDocument.toggleActiveEffect is documented in the API: https://foundryvtt.com/api/TokenDocument.html#toggleActiveEffect
        await token.document.toggleActiveEffect(effectData, options);
      }
      return;
    }

    //else toggle the effect directly on the actor
    const existingEffect = this.effects.find(
      (e) => e.getFlag('core', 'statusId') === effectData.id,
    );
    const state = options.active ?? !existingEffect;
    if (!state && existingEffect) {
      //remove the existing effect
      await existingEffect.delete();
    } else if (state) {
      //add new effect
      const createData = foundry.utils.deepClone(
        effectData,
      ) as Partial<StatusEffect>;
      //localize the label
      createData.label = game.i18n.localize(effectData.label as string);
      setProperty(createData, 'flags.core.statusId', effectData.id);
      if (options.overlay) setProperty(createData, 'flags.core.overlay', true);
      //remove id property to not violate validation
      delete createData.id;
      const cls = getDocumentClass('ActiveEffect');
      await cls.create(createData, { parent: this });
    }
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
    let newValue = this.data.data.bennies.max;
    const hardChoices = game.settings.get('swade', 'hardChoices');
    if (
      hardChoices &&
      this.isWildcard &&
      this.type === 'npc' &&
      !this.hasPlayerOwner
    ) {
      newValue = 0;
    }
    await this.update({ 'data.bennies.value': newValue });
  }

  /** Calculates the total Wound Penalties */
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

  /** Calculates the total Fatigue Penalties */
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
    const isBound = getProperty(this.data, 'data.status.isBound');
    if (isDistracted || isEntangled || isBound) {
      retVal -= 2;
    }
    return retVal;
  }

  calcScale(size: number): number {
    let scale = 0;
    if (Number.between(size, 20, 12)) scale = 6;
    else if (Number.between(size, 11, 8)) scale = 4;
    else if (Number.between(size, 7, 4)) scale = 2;
    else if (Number.between(size, 3, -1)) scale = 0;
    else if (size === -2) scale = -2;
    else if (size === -3) scale = -4;
    else if (size === -4) scale = -6;
    return scale;
  }

  /**
   * Function for shorcut roll in item (@str + 1d6)
   * return something like : {agi: "1d8x+1", sma: "1d6x", spi: "1d6x", str: "1d6x-1", vig: "1d6x"}
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

  getRollData(): Record<string, number | string> {
    const retVal = this.getRollShortcuts();
    retVal['wounds'] = this.data.data.wounds.value || 0;

    if (this.data.type === 'vehicle') {
      retVal['topspeed'] = this.data.data.topspeed || 0;
    } else {
      const skills = this.itemTypes.skill;
      for (const skill of skills) {
        if (skill.data.type !== 'skill') continue;
        const skillDie = Number(skill.data.data.die.sides);
        const skillMod = Number(skill.data.data.die.modifier);
        const name = skill.name!.slugify({ strict: true });
        retVal[name] = `1d${skillDie}x[${skill.name}]${
          skillMod !== 0 ? skillMod.signedString() : ''
        }`;
      }
      retVal['fatigue'] = this.data.data.fatigue.value || 0;
      retVal['pace'] = this.data.data.stats.speed.adjusted || 0;
    }
    return retVal;
  }

  /** Calculates the correct armor value based on SWADE v5.5 and returns that value */
  calcArmor(): number {
    return this._getArmorForLocation(CONFIG.SWADE.CONST.ARMOR_LOCATIONS.Torso);
  }

  /**
   * Calculates the Toughness value and returns it, optionally with armor
   * @param includeArmor include armor in final value (true/false). Default is true
   */
  calcToughness(includeArmor = true): number {
    if (this.data.type === 'vehicle') return 0;
    let finalToughness = 0;

    //get the base values we need
    const vigor = this.data.data.attributes.vigor.die.sides;
    const vigMod = this.data.data.attributes.vigor.die.modifier;
    const toughMod = this.data.data.stats.toughness.modifier;

    finalToughness = Math.round(vigor / 2) + 2;

    const size = this.data.data.stats.size ?? 0;
    finalToughness += size;
    finalToughness += toughMod;

    if (vigMod > 0) {
      finalToughness += Math.floor(vigMod / 2);
    }

    //add the toughness from the armor
    for (const armor of this.itemTypes.armor) {
      if (armor.data.type !== 'armor') continue;
      if (armor.data.data.equipped && armor.data.data.locations.torso) {
        finalToughness += armor.data.data.toughness;
      }
    }

    if (includeArmor) {
      finalToughness += this.calcArmor();
    }

    return Math.max(finalToughness, 1);
  }

  /** Calculates the maximum carry capacity based on the strength die and any adjustment steps */
  calcMaxCarryCapacity(): number {
    if (this.data.type === 'vehicle') return 0;
    const unit = game.settings.get('swade', 'weightUnit');
    const strength = deepClone(this.data.data.attributes.strength);
    const stepAdjust = Math.max(strength.encumbranceSteps * 2, 0);
    strength.die.sides += stepAdjust;
    //bound the adjusted strength die to 12
    const encumbDie = this._boundTraitDie(strength.die);

    if (unit === 'imperial') {
      return this._calcImperialCapacity(encumbDie);
    } else if (unit === 'metric') {
      return this._calcMetricCapacity(encumbDie);
    } else {
      throw new Error(`Value ${unit} is an unknown value!`);
    }
  }

  calcInventoryWeight(): number {
    const items = [
      ...this.itemTypes.shield,
      ...this.itemTypes.weapon,
      ...this.itemTypes.armor,
      ...this.itemTypes.gear,
    ];
    let retVal = 0;
    items.forEach((i) => {
      retVal += i.data.data['weight'] * i.data.data['quantity'];
    });
    return retVal;
  }

  calcParry(): number {
    if (this.data.type === 'vehicle') return 0;
    let parryTotal = 0;
    const parryBase = game.settings.get('swade', 'parryBaseSkill');
    const parryBaseSkill = this.itemTypes['skill'].find(
      (i) => i.name === parryBase,
    );

    let skillDie = 0;
    let skillMod = 0;
    if (parryBaseSkill) {
      skillDie = getProperty(parryBaseSkill, 'data.data.die.sides') ?? 0;
      skillMod = getProperty(parryBaseSkill, 'data.data.die.modifier') ?? 0;
    }

    //base parry calculation
    parryTotal = skillDie / 2 + 2;

    //add modifier if the skill die is 12
    if (skillDie >= 12) {
      parryTotal += Math.floor(skillMod / 2);
    }

    //add shields
    for (const shield of this.itemTypes.shield) {
      if (shield.data.data['equipped']) {
        parryTotal += getProperty(shield.data, 'data.parry') ?? 0;
      }
    }

    //add equipped weapons
    for (const weapon of this.itemTypes.weapon) {
      if (weapon.data.data['equipped']) {
        parryTotal += getProperty(weapon.data, 'data.parry') ?? 0;
      }
    }

    return parryTotal;
  }

  /** Helper Function for Vehicle Actors, to roll Maneuvering checks */
  async rollManeuverCheck() {
    if (this.data.type !== 'vehicle') return;
    const driver = await this.getDriver();

    //Return early if no driver was found
    if (!driver) return;

    //Get skillname
    let skillName = this.data.data.driver.skill;
    if (skillName === '') {
      skillName = this.data.data.driver.skillAlternative;
    }

    // Calculate handling
    const handling = this.data.data.handling;
    const wounds = this.calcWoundPenalties();
    const basePenalty = handling + wounds;

    //Handling is capped at a certain penalty
    const totalHandling = Math.max(
      basePenalty,
      SWADE.vehicles.maxHandlingPenalty,
    );

    //Find the operating skill
    const skill = driver.itemTypes.skill.find((i) => i.name === skillName);
    driver.rollSkill(skill?.id, {
      additionalMods: [
        {
          label: game.i18n.localize('SWADE.Handling'),
          value: totalHandling,
        },
      ],
    });
  }

  async getDriver(): Promise<SwadeActor | undefined> {
    if (this.data.type !== 'vehicle') return;
    const driverId = this.data.data.driver.id;
    let driver: SwadeActor | undefined = undefined;
    if (driverId) {
      try {
        driver = (await fromUuid(driverId)) as SwadeActor;
      } catch (error) {
        ui.notifications.error('The Driver could not be found!');
      }
    }
    return driver;
  }

  protected _handleComplexSkill(
    skill: SwadeItem,
    options: IRollOptions,
  ): [Roll, TraitRollModifier[]] {
    if (this.data.type === 'vehicle') {
      throw new Error('Only Extras and Wildcards can roll skills!');
    }
    if (skill.data.type !== 'skill') {
      throw new Error('Detected-non skill in skill roll construction');
    }
    if (!options.rof) options.rof = 1;
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
    const basePool = PoolTerm.fromRolls(rolls);
    basePool.modifiers.push(kh);

    const rollMods = this._buildTraitRollModifiers(
      skillData,
      options,
      skill.name,
    );

    //add encumbrance penalty if necessary
    if (skill.data.data.attribute === 'agility' && this.isEncumbered) {
      rollMods.push({
        label: game.i18n.localize('SWADE.Encumbered'),
        value: -2,
      });
    }

    return [Roll.fromTerms([basePool]), rollMods];
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
      //FIXME revisit once types are updated
      //@ts-expect-error Types are too strict here
      modifiers: ['x', ...modifiers],
      options: { flavor: flavor.replace(/[^a-zA-Z\d\s:\u00C0-\u00FF]/g, '') },
    });
  }

  /**
   * Thus
   * @param die The die to adjust
   * @returns the properly adjusted trait die
   */
  private _boundTraitDie(die: TraitDie): TraitDie {
    const sides = die.sides;
    if (sides < 4 && sides !== 1) {
      die.sides = 4;
    } else if (sides > 12) {
      //const difference = sides - 12;
      die.sides = 12;
      //die.modifier += difference / 2;
    }
    return die;
  }

  private _buildWildDie(sides = 6, modifiers: string[] = []): Die {
    const die = new Die({
      faces: sides,
      //FIXME revisit once types are updated
      //@ts-expect-error Types are too strict here
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
    name: string | null | undefined,
  ): TraitRollModifier[] {
    const mods = new Array<TraitRollModifier>();

    //Trait modifier
    const modifier = parseInt(data.die.modifier);
    if (!isNaN(modifier) && modifier !== 0) {
      mods.push({
        label: name
          ? `${name} ${game.i18n.localize('SWADE.Modifier')}`
          : game.i18n.localize('SWADE.TraitMod'),
        value: modifier,
      });
    }

    // Wounds
    const woundPenalties = this.calcWoundPenalties();
    if (woundPenalties !== 0) {
      mods.push({
        label: game.i18n.localize('SWADE.Wounds'),
        value: woundPenalties,
      });
    }

    //Fatigue
    const fatiguePenalties = this.calcFatiguePenalties();
    if (fatiguePenalties !== 0) {
      mods.push({
        label: game.i18n.localize('SWADE.Fatigue'),
        value: fatiguePenalties,
      });
    }

    //Additional Mods
    if (options.additionalMods) {
      options.additionalMods.forEach((v) => {
        if (typeof v === 'string' || typeof v === 'number') {
          console.warn(
            'The use of bare strings and numbers will be soon deprecated, please switch over to the TraitRollModifier interface',
          );
          mods.push({ label: game.i18n.localize('SWADE.Addi'), value: v });
        } else {
          mods.push(v);
        }
      });
    }

    //Joker
    if (this.hasJoker) {
      mods.push({
        label: game.i18n.localize('SWADE.Joker'),
        value: 2,
      });
    }

    if (this.data.type !== 'vehicle') {
      //Status penalties
      if (this.data.data.status.isEntangled) {
        mods.push({
          label: game.i18n.localize('SWADE.Entangled'),
          value: -2,
        });
      } else if (this.data.data.status.isBound) {
        mods.push({
          label: game.i18n.localize('SWADE.Bound'),
          value: -2,
        });
      } else if (this.data.data.status.isDistracted) {
        mods.push({
          label: game.i18n.localize('SWADE.Distr'),
          value: -2,
        });
      }

      //Conviction Die
      const useConviction =
        this.isWildcard &&
        this.data.data.details.conviction.active &&
        game.settings.get('swade', 'enableConviction');
      if (useConviction) {
        mods.push({
          label: game.i18n.localize('SWADE.Conv'),
          value: '+1d6x',
        });
      }
    }

    return mods
      .filter((m) => m.value) //filter out the nullish values
      .sort((a, b) => a.label.localeCompare(b.label)); //sort the mods alphabetically by label
  }

  private _calcImperialCapacity(strength: TraitDie): number {
    const modifier = Math.max(strength.modifier, 0);
    return (strength.sides / 2 - 1 + modifier) * 20;
  }

  private _calcMetricCapacity(strength: TraitDie): number {
    const modifier = Math.max(strength.modifier, 0);
    return (strength.sides / 2 - 1 + modifier) * 10;
  }

  /**
   * @param location The location of the armor such as head, torso, arms or legs
   * @returns The total amount of armor for that location
   */
  private _getArmorForLocation(
    location: ValueOf<typeof SWADE.CONST.ARMOR_LOCATIONS>,
  ): number {
    if (this.data.type === 'vehicle') return 0;

    let totalArmorVal = 0;

    //get armor items and retrieve their data
    const armorList = this.itemTypes.armor.map((i) =>
      i.data.type === 'armor' ? i.data : null,
    );

    const nonNaturalArmors = armorList
      .filter((i) => {
        const isEquipped = i?.data.equipped;
        const isLocation = i?.data.locations[location];
        const isNaturalArmor = i?.data.isNaturalArmor;
        return isEquipped && !isNaturalArmor && isLocation;
      })
      .sort((a, b) => {
        const aValue = Number(a!.data.armor);
        const bValue = Number(b!.data.armor);
        return bValue - aValue;
      });

    if (nonNaturalArmors.length === 1) {
      totalArmorVal = Number(nonNaturalArmors[0]!.data.armor);
    } else if (nonNaturalArmors.length > 1) {
      totalArmorVal =
        Number(nonNaturalArmors[0]!.data.armor) +
        Math.floor(Number(nonNaturalArmors[1]!.data.armor) / 2);
    }

    //add natural armor
    armorList
      .filter((i) => {
        const isEquipped = i!.data.equipped;
        const isLocation = i?.data.locations[location];
        const isNaturalArmor = i!.data.isNaturalArmor;
        return isNaturalArmor && isEquipped && isLocation;
      })
      .forEach((i) => {
        totalArmorVal += Number(i!.data.armor);
      });

    return totalArmorVal;
  }

  private _filterOverrides() {
    const overrides = foundry.utils.flattenObject(this.overrides);
    for (const k of Object.keys(overrides)) {
      if (k.startsWith('@')) {
        delete overrides[k];
      }
    }
    this.overrides = foundry.utils.expandObject(overrides);
  }

  async _preCreate(
    createData: ActorDataConstructorData,
    options: DocumentModificationOptions,
    user: User,
  ) {
    await super._preCreate(createData, options, user);
    //return early if it's a vehicle
    if (createData.type === 'vehicle') return;

    //only link NPCs if the autolink setting is on and they're not getting imported from somewhere
    if (game.settings.get('swade', 'autoLinkWildcards')) {
      const autoActorLink =
        createData.type === 'npc' &&
        foundry.utils.getProperty(createData, 'data.wildcard') &&
        !foundry.utils.hasProperty(createData, 'flags.core.sourceId');

      const tokenData = foundry.utils.mergeObject(this.data.token.toObject(), {
        actorLink: autoActorLink,
      });

      this.data.token.update(tokenData);
    }

    const coreSkillList = game.settings.get('swade', 'coreSkills');
    //only do this if this is a PC with no prior skills
    if (
      coreSkillList &&
      createData.type === 'character' &&
      this.itemTypes.skill.length <= 0
    ) {
      //Get list of core skills from settings
      const coreSkills = coreSkillList.split(',').map((s) => s.trim());

      //Set compendium source
      const pack = game.packs.get(
        game.settings.get('swade', 'coreSkillsCompendium'),
        { strict: true },
      ) as CompendiumCollection<ItemMetadata>;

      const skillIndex = await pack.getDocuments();

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
            //@ts-expect-error We're just adding some base data for a skill here.
            data: {
              attribute: '',
            },
          });
        }
      }

      //set all the skills to be core skills
      for (const skill of skills) {
        if (skill.type === 'skill') skill.data.isCoreSkill = true;
      }

      //Add the Untrained skill
      skills.push({
        name: game.i18n.localize('SWADE.Unskilled'),
        type: 'skill',
        img: 'systems/swade/assets/icons/skill.svg',
        //@ts-expect-error We're just adding some base data for a skill here.
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
    changed: DeepPartial<ActorDataConstructorData>,
    options: DocumentModificationOptions,
    user: BaseUser,
  ) {
    await super._preUpdate(changed, options, user);
    //wildcards will be linked, extras unlinked
    const autoLinkWildcards = game.settings.get('swade', 'autoLinkWildcards');
    if (
      this.type === 'npc' &&
      autoLinkWildcards &&
      hasProperty(changed, 'data.wildcard')
    ) {
      const isWildcard = getProperty(changed, 'data.wildcard') as boolean;
      await this.data.token.update({
        actorLink: isWildcard,
      });
    }
  }

  async _onUpdate(
    changed: DeepPartial<SwadeActorDataSource> & Record<string, unknown>,
    options: DocumentModificationOptions,
    user: string,
  ) {
    super._onUpdate(changed, options, user);
    if (this.data.type === 'npc') {
      ui.actors?.render(true);
    }
    if (hasProperty(changed, 'data.bennies') && this.hasPlayerOwner) {
      ui.players?.render(true);
    }
  }
}

export type Attribute = keyof typeof SWADE.attributes;
type ArmorLocation = ValueOf<typeof SWADE.CONST.ARMOR_LOCATIONS>;
type ArmorPerLocation = Record<ArmorLocation, number>;
