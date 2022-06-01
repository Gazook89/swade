import { Advance } from '../../interfaces/Advance.interface';
import { constants } from '../constants';
import SwadeActor from '../documents/actor/SwadeActor';
import { getRankFromAdvanceAsString } from '../util';

export class AdvanceEditor extends FormApplication<
  FormApplicationOptions,
  object,
  AdvanceEditorContext
> {
  constructor({ advance, actor }: AdvanceEditorContext, options = {}) {
    super({ advance, actor }, options);
    if (actor.type === 'vehicle') {
      throw TypeError(`Actor type ${actor.type} not permissible`);
    }
  }

  get ctx() {
    return this.object;
  }

  get advances() {
    return getProperty(
      this.ctx.actor.data,
      'data.advances.list',
    ) as Collection<Advance>;
  }

  static get defaultOptions(): FormApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/swade/templates/apps/advanceEditor.hbs',
      title: game.i18n.localize('SWADE.Advances.EditorTitle'),
      classes: ['swade'],
      width: 400,
      height: 'auto' as const,
      submitOnClose: false,
      closeOnSubmit: true,
      submitOnChange: false,
    });
  }

  async getData(_options?: Partial<FormApplicationOptions>): Promise<any> {
    const advance = this.object.advance;
    const data = {
      advance: advance,
      rank: getRankFromAdvanceAsString(advance.sort ?? 0),
      advanceTypes: this._getAdvanceTypes(),
    };
    return data;
  }

  protected async _updateObject(
    _event: Event,
    formData: Advance,
  ): Promise<unknown> {
    const sortHasChanged = formData.sort !== this.ctx.advance.sort;
    //merge data to update
    const advance: Advance = foundry.utils.mergeObject(this.object.advance, {
      notes: formData.notes,
      planned: formData.planned,
      type: formData.type,
      sort: Math.clamped(formData.sort, 1, this.advances.size),
    });
    if (sortHasChanged) return this._handleSortingChange(advance);
    //normal update operation
    this.advances.set(advance.id, advance);
    return this.ctx.actor.update(
      { 'data.advances.list': this.advances.toJSON() },
      { diff: false },
    );
  }

  private _getAdvanceTypes(): Record<number, string> {
    return {
      [constants.ADVANCE_TYPE.EDGE]: 'SWADE.Advances.Types.Edge',
      [constants.ADVANCE_TYPE.SINGLE_SKILL]: 'SWADE.Advances.Types.SingleSkill',
      [constants.ADVANCE_TYPE.TWO_SKILLS]: 'SWADE.Advances.Types.TwoSkills',
      [constants.ADVANCE_TYPE.ATTRIBUTE]: 'SWADE.Advances.Types.Attribute',
      [constants.ADVANCE_TYPE.HINDRANCE]: 'SWADE.Advances.Types.Hindrance',
    };
  }

  private _handleSortingChange(advance: Advance) {
    //remove the old advance
    if (this.advances.has(advance.id)) this.advances.delete(advance.id);
    const arr = this.advances.toJSON();
    //calculate new index
    const newIndex = Math.max(0, advance.sort - 1);
    //insert new advance into array
    arr.splice(newIndex, 0, advance);
    //update sort values based on index
    arr.forEach((a, i) => (a.sort = i + 1));
    //yeet
    return this.ctx.actor.update(
      { 'data.advances.list': arr },
      { diff: false },
    );
  }
}

export interface AdvanceEditorContext {
  advance: Advance;
  actor: SwadeActor;
}

export interface AdvanceEditorOptions extends FormApplicationOptions {}
