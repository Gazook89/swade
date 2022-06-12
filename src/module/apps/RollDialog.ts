import { TraitRollModifier } from '../../interfaces/additional.interface';
import WildDie from '../dice/WildDie';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import * as util from '../util';

export default class RollDialog extends FormApplication<
  FormApplicationOptions,
  object,
  RollDialogContext
> {
  resolve: (roll: Roll | null) => void;
  isResolved = false;
  extraButtonUsed = false;

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
      closeOnSubmit: true,
      submitOnClose: false,
      submitOnChange: false,
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

  activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    $(document).on('keydown.chooseDefault', this._onKeyDown.bind(this));
    html.find('button#close').on('click', this.close.bind(this));
    html.find('button.add-modifier').on('click', () => {
      this._addModifier();
      this.render();
    });
    html.find('.modifier button').on('click', (ev) => {
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

  async getData() {
    const data = {
      baseDice: this.ctx.roll.formula,
      displayExtraButton: true,
      rollModes: CONFIG.Dice.rollModes,
      modGroups: CONFIG.SWADE.prototypeRollGroups,
      extraButtonLabel: '',
      rollMode: game.settings.get('core', 'rollMode'),
      modifiers: this.ctx.mods.map(this._normalizeModValue),
      formula: this._buildRollForEvaluation().formula,
      isTraitRoll: this._isTraitRoll(),
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

  protected override async _updateObject(ev: Event, formData: FormData) {
    const expanded = foundry.utils.expandObject(formData) as RollDialogFormData;
    Object.values(expanded.modifiers ?? []).forEach(
      (v, i) => (this.ctx.mods[i].ignore = v.ignore),
    );
    if (expanded.map && expanded.map !== 0) {
      this.ctx.mods.push({
        label: game.i18n.localize('SWADE.MAPenalty'),
        value: expanded.map,
      });
    }

    //add any unsubmitted modifiers
    this._addModifier();
    const roll = await this._evaluateRoll();
    this._resolve(roll);
  }

  private _onKeyDown(event) {
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
      const modValue = this.form!.querySelector<HTMLInputElement>(
        '.new-modifier-value',
      )?.value;
      if (modValue) {
        this._addModifier();
        return this.render();
      }
      return this.submit();
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

  private _buildRollForEvaluation() {
    return Roll.fromTerms([
      ...this.ctx.roll.terms,
      ...Roll.parse(
        this.ctx.mods
          .filter((v) => !v.ignore) //remove the disabled modifiers
          .map(this._normalizeModValue)
          .reduce(util.modifierReducer, ''),
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
      .filter((v) => !v.ignore) //remove the disabled modifiers
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
    return {
      value: normalizedValue,
      label: mod.label,
      ignore: mod.ignore,
    };
  }

  private _isTraitRoll(): boolean {
    return !!this.ctx.actor;
  }

  /** Reads the modifier inputs, sanitizes them and adds the values to the mod array */
  private _addModifier() {
    const form = this.form!;
    const label = form.querySelector<HTMLInputElement>(
      '.new-modifier-label',
    )?.value;
    const value = form.querySelector<HTMLInputElement>(
      '.new-modifier-value',
    )?.value;
    if (value) {
      this.ctx.mods.push({
        label: label || game.i18n.localize('SWADE.Addi'),
        value: this._sanitizeModifierInput(value),
      });
    }
  }

  private _addPreset(ev: JQuery.ClickEvent) {
    const target = ev.currentTarget as HTMLButtonElement;
    const index = Number(target.dataset.index);
    const group = CONFIG.SWADE.prototypeRollGroups.find(
      (v) => v.name === target.dataset.group,
    );
    if (!group) return;
    const modifier = group.modifiers[index];
    if (!modifier) return;
    this.ctx.mods.push({
      label: modifier.label,
      value: modifier.value,
    });
  }

  override close(options?: Application.CloseOptions): Promise<void> {
    //fallback if the roll has not yet been resolved
    if (!this.isResolved) this.resolve(null);
    $(document).off('keydown.chooseDefault');
    return super.close(options);
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
  map?: number;
  rollMode: foundry.CONST.DICE_ROLL_MODES;
}
