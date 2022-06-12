import { TraitRollModifier } from '../../interfaces/additional.interface';
import { constants } from '../constants';
import WildDie from '../dice/WildDie';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import { modifierFilter, modifierReducer } from '../util';

export default class RollDialog extends FormApplication<
  FormApplicationOptions,
  object,
  RollDialogContext
> {
  resolve: (roll: Roll | null) => void;
  isResolved = false;
  extraButtonUsed = false;
  _newModifierLabel: string | undefined;
  _newModifierValue: string | undefined;

  static asPromise(ctx: RollDialogContext): Promise<Roll | null> {
    return new Promise((resolve) => new RollDialog(ctx, resolve));
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/swade/templates/apps/rollDialog.hbs',
      classes: ['swade', 'roll-dialog'],
      width: 400,
      filters: [
        {
          inputSelector: 'input.searchbox',
          contentSelector: '.selections',
        },
      ],
      height: 'auto' as const,
      closeOnSubmit: false,
      submitOnClose: false,
      submitOnChange: true,
    });
  }

  constructor(
    ctx: RollDialogContext,
    resolve: (roll: Roll | null) => void,
    options?: Partial<FormApplicationOptions>,
  ) {
    super(ctx, options);
    this.resolve = resolve;
    this.render(true);
  }

  get ctx() {
    return this.object;
  }

  get title(): string {
    return this.ctx.title ?? 'SWADE Rolldialog';
  }

  get rollMode(): foundry.CONST.DICE_ROLL_MODES {
    const select = this.form?.querySelector<HTMLSelectElement>('#rollMode');
    return (
      (select?.value as foundry.CONST.DICE_ROLL_MODES) ??
      game.settings.get('core', 'rollMode')
    );
  }

  get rangeModifier() {
    return this.ctx.mods.find((m) => m.type === constants.MODIFIER_TYPE.RANGE);
  }

  get maPenalty() {
    return this.ctx.mods.find((m) => m.type === constants.MODIFIER_TYPE.MAP);
  }

  get lightModifier() {
    return this.ctx.mods.find((m) => m.type === constants.MODIFIER_TYPE.LIGHT);
  }

  get coverModifier() {
    return this.ctx.mods.find((m) => m.type === constants.MODIFIER_TYPE.COVER);
  }

  get choiceLabels() {
    return {
      range: {
        '+0': 'SWADE.Range.Short',
        '-2': 'SWADE.Range.Medium',
        '-4': 'SWADE.Range.Long',
        '-8': 'SWADE.Range.Extreme',
      },
      map: {
        '+0': 'SWADE.MAPenalty.None',
        '-2': '-2',
        '-4': '-4',
      },
      light: {
        '+0': 'SWADE.Light.Normal',
        '-2': 'SWADE.Light.Dim',
        '-4': 'SWADE.Light.Dark',
        '-6': 'SWADE.Light.Pitch',
      },
      cover: {
        '+0': 'SWADE.MAPenalty.None',
        '-2': 'SWADE.Cover.Light',
        '-4': 'SWADE.Cover.Medium',
        '-6': 'SWADE.Cover.Heavy',
        '-8': 'SWADE.Cover.Total',
      },
    };
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    $(document).on('keydown.chooseDefault', this._onKeyDown.bind(this));
    html.find('button#close').on('click', this.close.bind(this));
    html.find('button#submit').on('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      //add any unsubmitted modifiers
      this._addModifier();
      const roll = await this._evaluateRoll();
      this._resolve(roll);
    });
    html.find('button.add-modifier').on('click', () => {
      this._addModifier();
      this.render();
    });
    html.find('.modifier .add-preset').on('click', (ev) => {
      this._addPreset(ev);
      this.render();
    });
    html.find('button.toggle-list').on('click', (ev) => {
      const target = ev.currentTarget as HTMLButtonElement;
      const width = getComputedStyle(target).width;
      html.find('.fas.fa-caret-right').toggleClass('rotate');
      html.find('.searchbox').outerWidth(width, true);
      html.find('.dropdown').outerWidth(width).slideToggle({ duration: 200 });
    });
    html.find('button[type="submit"]').on('click', (ev) => {
      this.extraButtonUsed = ev.currentTarget.dataset.type === 'extra';
      this.submit();
    });
    html.find('input[type="checkbox"]').on('change', (ev) => {
      const target = ev.currentTarget as HTMLInputElement;
      const index = Number(target.dataset.index);
      this.ctx.mods[index].ignore = target.checked;
      this.render();
    });
  }

  override async getData() {
    const data = {
      newModifierLabel: this._newModifierLabel,
      newModifierValue: this._newModifierValue,
      baseDice: this.ctx.roll.formula,
      displayExtraButton: true,
      rollModes: CONFIG.Dice.rollModes,
      modGroups: CONFIG.SWADE.prototypeRollGroups,
      extraButtonLabel: '',
      rollMode: game.settings.get('core', 'rollMode'),
      modifiers: this.ctx.mods
        .map(this._normalizeModValue)
        .filter(
          (m) =>
            ![
              constants.MODIFIER_TYPE.RANGE,
              constants.MODIFIER_TYPE.COVER,
              constants.MODIFIER_TYPE.LIGHT,
              constants.MODIFIER_TYPE.MAP,
            ].includes(m.type ?? constants.MODIFIER_TYPE.OTHER),
        ),
      formula: this._buildRollForEvaluation().formula,
      isTraitRoll: this._isTraitRoll(),
      range: {
        name: 'range',
        chosen: this.rangeModifier?.value.toString() ?? '+0',
        choices: this.choiceLabels.range,
      },
      map: {
        name: 'map',
        chosen: this.maPenalty?.value.toString() ?? '+0',
        choices: this.choiceLabels.map,
      },
      light: {
        name: 'light',
        chosen: this.lightModifier?.value.toString() ?? '+0',
        choices: this.choiceLabels.light,
      },
      cover: {
        name: 'cover',
        chosen: this.coverModifier?.value.toString() ?? '+0',
        choices: this.choiceLabels.cover,
      },
    };

    if (this.ctx.item) {
      data.extraButtonLabel = game.i18n.localize('SWADE.RollRaise');
    } else if (
      this.ctx.actor &&
      !this.ctx.actor.isWildcard &&
      this.ctx.allowGroup
    ) {
      data.extraButtonLabel = game.i18n.localize('SWADE.GroupRoll');
    } else {
      data.displayExtraButton = false;
    }

    return data;
  }

  override close(options?: Application.CloseOptions): Promise<void> {
    //fallback if the roll has not yet been resolved
    if (!this.isResolved) this.resolve(null);
    $(document).off('keydown.chooseDefault');
    return super.close(options);
  }

  protected override async _updateObject(ev: Event, formData: FormData) {
    const expanded = foundry.utils.expandObject(formData) as RollDialogFormData;
    this._newModifierLabel = expanded.newModifierLabel;
    this._newModifierValue = expanded.newModifierValue;
    Object.values(expanded.modifiers ?? []).forEach(
      (v, i) => (this.ctx.mods[i].ignore = v.ignore),
    );
    this._handleRangeModifier(expanded.range);
    this._handleMultiActionPenalty(expanded.map);
    this._handleLightModifier(expanded.light);
    this._handleCoverModifier(expanded.cover);
    this.render(true);
  }

  protected override _onSearchFilter(
    event: KeyboardEvent,
    query: string,
    rgx: RegExp,
    html: HTMLElement,
  ) {
    for (const li of Array.from(html.children) as HTMLLIElement[]) {
      if (li.classList.contains('group-header')) continue;
      const btn = li.querySelector('button');
      const name = btn?.textContent;
      const match = rgx.test(SearchFilter.cleanQuery(name!));
      li.style.display = match ? 'block' : 'none';
    }
  }

  private async _onKeyDown(event) {
    // Close dialog
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      return this.close();
    }

    // Confirm default choice or add a modifier
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      //add any un-submitted modifiers
      this._addModifier();
      const roll = await this._evaluateRoll();
      this._resolve(roll);
      this.close();
    }
  }

  private _resolve(roll: Roll) {
    this.isResolved = true;
    this.resolve(roll);
    this.close();
  }

  async _evaluateRoll(): Promise<Roll> {
    //Raise Damage
    if (this.extraButtonUsed && this.ctx.item && !this.ctx.actor) {
      this.ctx.mods.push({
        label: game.i18n.localize('SWADE.BonusDamage'),
        value: `+1d${this.ctx.item.data.data['bonusDamageDie']}x`,
      });
    }

    const roll = this._buildRollForEvaluation();
    const terms = roll.terms;
    let flavor = this.ctx.flavor;

    //Add the Wild Die for a group roll of
    if (
      this.extraButtonUsed &&
      this.ctx.allowGroup &&
      this.ctx.actor &&
      !this.ctx.actor.isWildcard
    ) {
      const traitPool = terms[0];
      if (traitPool instanceof PoolTerm) {
        const wildDie = new WildDie();
        const wildRoll = Roll.fromTerms([wildDie]);
        traitPool.rolls.push(wildRoll);
        traitPool.terms.push(wildRoll.formula);
        flavor += `<br>${game.i18n.localize('SWADE.GroupRoll')}`;
      }
    }

    //recreate the roll
    const finalizedRoll = Roll.fromTerms(terms, roll.options);

    //evaluate
    await finalizedRoll.evaluate({ async: true });

    // Convert the roll to a chat message and return it
    await finalizedRoll.toMessage(
      {
        flavor: flavor + this._buildModifierFlavor(),
        speaker: this.ctx.speaker,
        flags: this.ctx.flags ?? {},
      },
      { rollMode: this.rollMode },
    );
    return finalizedRoll;
  }

  private _buildRollForEvaluation() {
    return Roll.fromTerms([
      ...this.ctx.roll.terms,
      ...Roll.parse(
        this.ctx.mods
          .filter(modifierFilter)
          .map(this._normalizeModValue)
          .reduce(modifierReducer, ''),
        this._getRollData(),
      ),
    ]);
  }

  /** add a + if no +/- is present in the situational mod */
  private _sanitizeModifierInput(modifier: string): string {
    if (modifier.startsWith('@')) return modifier;
    if (!modifier[0].match(/[+-]/)) return '+' + modifier;
    return modifier;
  }

  private _buildModifierFlavor() {
    return this.ctx.mods
      .filter(modifierFilter)
      .reduce((acc: string, cur: TraitRollModifier) => {
        return (acc += `<br>${cur.label}: ${cur.value}`);
      }, '');
  }

  private _getRollData() {
    if (this.ctx.actor) return this.ctx.actor.getRollData();
    return this.ctx.item?.actor?.getRollData() ?? {};
  }

  /** Normalize a given modifier value to a string for display and evaluation */
  private _normalizeModValue(mod: TraitRollModifier): TraitRollModifier {
    let normalizedValue: string;
    if (typeof mod.value === 'string') {
      normalizedValue = mod.value === '' ? '+0' : mod.value;
    } else if (typeof mod.value === 'number') {
      normalizedValue = mod.value.signedString();
    } else {
      throw new Error('Invalid modifier value ' + mod.value);
    }
    mod.value = normalizedValue;
    return mod;
  }

  private _isTraitRoll(): boolean {
    return !!this.ctx.actor;
  }

  private _handleRangeModifier(range: string) {
    if (!Number.isNumeric(range)) return;
    const label = game.i18n.format('SWADE.Range._template', {
      name: game.i18n.localize('SWADE.Range._name'),
      bracket: game.i18n.localize(this.choiceLabels.range[range]),
    });
    if (!this.rangeModifier) {
      this.ctx.mods.push({
        label: label,
        value: range,
        type: constants.MODIFIER_TYPE.RANGE,
      });
    } else {
      this.rangeModifier.value = range;
      this.rangeModifier.label = label;
    }
  }

  private _handleMultiActionPenalty(map: string) {
    if (!Number.isNumeric(map)) return;
    const label = game.i18n.localize('SWADE.MAPenalty.Label');
    if (!this.maPenalty) {
      this.ctx.mods.push({
        label: label,
        value: map,
        type: constants.MODIFIER_TYPE.MAP,
      });
    } else {
      this.maPenalty.value = map;
      this.maPenalty.label = label;
    }
  }

  private _handleLightModifier(light: string) {
    if (!Number.isNumeric(light)) return;
    const label = game.i18n.format('SWADE.Light._template', {
      name: game.i18n.localize('SWADE.Light._name'),
      bracket: game.i18n.localize(this.choiceLabels.light[light]),
    });
    if (!this.lightModifier) {
      this.ctx.mods.push({
        label: label,
        value: light,
        type: constants.MODIFIER_TYPE.LIGHT,
      });
    } else {
      this.lightModifier.value = light;
      this.lightModifier.label = label;
    }
  }

  private _handleCoverModifier(cover: string) {
    if (!Number.isNumeric(cover)) return;
    const label = game.i18n.format('SWADE.Light._template', {
      name: game.i18n.localize('SWADE.Cover._name'),
      bracket: game.i18n.localize(this.choiceLabels.cover[cover]),
    });
    if (!this.coverModifier) {
      this.ctx.mods.push({
        label: label,
        value: cover,
        type: constants.MODIFIER_TYPE.COVER,
      });
    } else {
      this.coverModifier.value = cover;
      this.coverModifier.label = label;
    }
  }

  /** Reads the modifier inputs, sanitizes them and adds the values to the mod array */
  private _addModifier() {
    const label = this._newModifierLabel;
    const value = this._newModifierValue;
    if (value) {
      this.ctx.mods.push({
        label: label || game.i18n.localize('SWADE.Addi'),
        value: this._sanitizeModifierInput(value),
      });
    }
    this._newModifierLabel = '';
    this._newModifierValue = '';
  }

  private _addPreset(ev: JQuery.ClickEvent) {
    const target = ev.currentTarget as HTMLButtonElement;
    const group = CONFIG.SWADE.prototypeRollGroups.find(
      (v) => v.name === target.dataset.group,
    );
    const modifier = group?.modifiers[Number(target.dataset.index)];
    if (modifier) {
      this.ctx.mods.push({
        label: modifier.label,
        value: modifier.value,
      });
    }
  }
}

interface RollDialogContext {
  roll: Roll;
  mods: TraitRollModifier[];
  speaker: foundry.data.ChatMessageData['speaker']['_source'];
  flavor: string;
  title: string;
  item?: SwadeItem;
  actor?: SwadeActor;
  allowGroup?: boolean;
  flags?: Record<string, unknown>;
}

interface RollDialogFormData {
  modifiers?: TraitRollModifier[];
  newModifierLabel?: string;
  newModifierValue?: string;
  map: string;
  range: string;
  light: string;
  cover: string;
  rollMode: foundry.CONST.DICE_ROLL_MODES;
}
