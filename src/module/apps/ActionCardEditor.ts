import { SWADE } from '../config';

interface ScrollRenderOptions extends Application.RenderOptions {
  scroll?: boolean;
}

interface CardData {
  name: string;
  img: string;
  cardValue: number;
  suitValue: number;
  isJoker: boolean;
}

export default class ActionCardEditor extends FormApplication {
  constructor(cards: Cards, options: Partial<FormApplication.Options> = {}) {
    super(cards, options);
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: SWADE.actionCardEditor.id,
      title: game.i18n.localize('SWADE.ActionCardEditor'),
      template: 'systems/swade/templates/apps/action-card-editor.hbs',
      classes: ['swade', 'action-card-editor'],
      scrollY: ['.card-list'],
      width: 600,
      height: 'auto' as const,
      closeOnSubmit: false,
      submitOnClose: false,
    };
  }

  get cards() {
    return this.object as Cards;
  }

  async getData() {
    const data = {
      deckName: this.cards.name,
      cards: Array.from(this.cards.cards.values()).sort(this._sortCards),
    };
    return data as any;
  }

  activateListeners(html: JQuery) {
    super.activateListeners(html);
    html.find('.card-face').on('click', (ev) => this._showCard(ev));
    html.find('.add-card').on('click', async () => this._createNewCard());
  }

  protected async _updateObject(event: Event, formData = {}) {
    const data = expandObject(formData);
    const cards = Object.entries(data.card) as [string, CardData][];
    const updates = new Array<Record<string, unknown>>();
    for (const [id, value] of cards) {
      const newData = {
        name: value.name,
        faces: [
          {
            name: value.name,
            img: value.img,
          },
        ],
        value: value.cardValue,
        data: {
          isJoker: value.suitValue > 90,
          suit: value.suitValue,
        },
      };
      //grab the current card and diff it against the object we got from the form
      const current = this.cards.cards.get(id, { strict: true });
      const diff = foundry.utils.diffObject(current.data.toObject(), newData);
      //skip if there's no differences
      if (foundry.utils.isObjectEmpty(diff)) continue;
      //set the ID for the update
      diff['_id'] = id;
      updates.push(foundry.utils.flattenObject(diff));
    }
    await this.cards.updateEmbeddedDocuments('Card', updates);
    this.render(true);
  }

  private _sortCards(a: Card, b: Card) {
    const suitA = a.data.data['suit'];
    const suitB = b.data.data['suit'];
    const suit = suitB - suitA;
    if (suit !== 0) return suit;
    const cardA = a.data.value ?? 0;
    const cardB = b.data.value ?? 0;
    const card = cardB - cardA;
    return card;
  }

  private _showCard(event: JQuery.ClickEvent<HTMLElement>) {
    const id = event.currentTarget.dataset.id!;
    const card = this.cards.cards.get(id);
    if (!card) return;
    new ImagePopout(card.face?.img!, {
      shareable: true,
    }).render(true);
  }

  private async _createNewCard() {
    const newCard = await Card.create(
      {
        name: 'New Card',
        type: 'poker',
        faces: [
          {
            img: 'systems/swade/assets/ui/ace-white.svg',
            name: 'New Card',
          },
        ],
        face: 0,
        origin: this.cards.id,
      },
      { parent: this.cards },
    );
    if (newCard) {
      this.render(true, { scroll: true });
    }
  }

  render(force: boolean, options?: ScrollRenderOptions) {
    super.render(force, options);
  }

  async _render(force?: boolean, options: ScrollRenderOptions = {}) {
    await super._render(force, options);
    if (options.scroll) {
      document
        .querySelector(`#${SWADE.actionCardEditor.id} .card-list`)
        ?.scrollIntoView(false);
    }
  }
}
