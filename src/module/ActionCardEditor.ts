import { SWADE } from './config';

interface CardData {
  name: string;
  img: string;
  cardValue: number;
  suitValue: number;
}

export default class ActionCardEditor extends FormApplication {
  cards: Map<string, JournalEntry>;

  constructor(
    cards: JournalEntry[],
    options: Partial<FormApplication.Options> = {},
  ) {
    super({}, options);
    this.cards = new Map(cards.map((v) => [v.id, v]));
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: SWADE.actionCardEditor.id,
      title: game.i18n.localize('SWADE.ActionCardEditor'),
      template: 'systems/swade/templates/action-card-editor.html',
      classes: ['swade', 'action-card-editor'],
      width: 800,
      height: 'auto' as const,
      closeOnSubmit: false,
      submitOnClose: false,
    };
  }

  getData() {
    const data = {
      cards: Array.from(this.cards.values()).sort(this._sortCards),
    };
    return data as any;
  }

  activateListeners(html: JQuery) {
    super.activateListeners(html);
    html.find('.card-face').on('click', (event) => {
      const id = event.currentTarget.dataset.id;
      new ImagePopout(this.cards.get(id).data.img, {
        shareable: true,
      }).render(true);
    });
  }

  protected async _updateObject(event: Event, formData?: object) {
    const data = expandObject(formData);
    for (const [id, value] of Object.entries(data) as [string, CardData][]) {
      console.log(id, value);
    }
  }

  private _sortCards(a: JournalEntry, b: JournalEntry) {
    const suitA = a.getFlag('swade', 'suitValue') as number;
    const suitB = b.getFlag('swade', 'suitValue') as number;
    const suit = suitB - suitA;
    if (suit !== 0) return suit;
    const cardA = a.getFlag('swade', 'cardValue') as number;
    const cardB = b.getFlag('swade', 'cardValue') as number;
    const card = cardB - cardA;
    return card;
  }
}
