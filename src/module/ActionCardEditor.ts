import { SWADE } from './config';

interface CardData {
  name: string;
  img: string;
  cardValue: number;
  suitValue: number;
  isJoker: boolean;
}

export default class ActionCardEditor extends FormApplication {
  static async fromPack(compendium: Compendium): Promise<ActionCardEditor> {
    //@ts-ignore
    const cards = await compendium.getDocuments();
    return new this(cards, compendium);
  }

  cards: Map<string, JournalEntry>;
  pack: Compendium;
  constructor(
    cards: JournalEntry[],
    pack: Compendium,
    options: Partial<FormApplication.Options> = {},
  ) {
    super({}, options);
    this.pack = pack;
    this.cards = new Map(cards.map((v) => [v.id, v]));
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: SWADE.actionCardEditor.id,
      title: game.i18n.localize('SWADE.ActionCardEditor'),
      template: 'systems/swade/templates/action-card-editor.html',
      classes: ['swade', 'action-card-editor'],
      scrollY: ['.card-list'],
      width: 800,
      height: 'auto' as const,
      closeOnSubmit: false,
      submitOnClose: false,
    };
  }

  async getData() {
    const data = {
      deckName: this.pack.metadata.label,
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
    html.find('.add-card').on('click', () => this._createNewCard());
  }

  protected async _updateObject(event: Event, formData?: object) {
    const data = expandObject(formData);
    for (const [id, value] of Object.entries(data) as [string, CardData][]) {
      const card = this.cards.get(id);
      if (this._cardChanged(card, value)) {
        await card.update({
          name: value.name,
          img: value.img,
          'flags.swade': {
            cardValue: value.cardValue,
            suitValue: value.suitValue,
            isJoker: value.isJoker,
          },
        });
      }
    }
    this.render(true);
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

  private _cardChanged(card: JournalEntry, data: CardData): boolean {
    const nameChanged = card.name !== data.name;
    const imgChanged = card.data.img !== data.img;
    const valueChanged = card.getFlag('swade', 'cardValue') !== data.cardValue;
    const suitChanged = card.getFlag('swade', 'suitValue') !== data.suitValue;
    const jokerChanged = card.getFlag('swade', 'isJoker') !== data.isJoker;
    return (
      nameChanged || imgChanged || valueChanged || suitChanged || jokerChanged
    );
  }

  private async _createNewCard() {
    const newCard = await JournalEntry.create(
      {
        name: 'New Card',
        img: 'systems/swade/assets/ui/ace-white.svg',
        'flags.swade': { cardValue: 0, suitValue: 0, isJoker: false },
      },
      { pack: this.pack.collection },
    );
    this.cards.set(newCard.id, newCard);
    await this.render(true);
  }
}
