import { JournalMetadata } from '../../globals';
import { SWADE } from '../config';

interface CardData {
  name: string;
  img: string;
  cardValue: number;
  suitValue: number;
  isJoker: boolean;
}

interface ScrollRenderOptions extends Application.RenderOptions {
  scroll?: boolean;
}

export default class ActionCardEditor extends FormApplication {
  static async fromPack(
    compendium: CompendiumCollection<JournalMetadata>,
  ): Promise<ActionCardEditor> {
    const cards = await compendium.getDocuments();
    return new this(cards, compendium);
  }

  cards: Map<string, JournalEntry>;
  pack: CompendiumCollection<JournalMetadata>;

  constructor(
    cards: JournalEntry[],
    pack: CompendiumCollection<JournalMetadata>,
    options: Partial<FormApplication.Options> = {},
  ) {
    super({}, options);
    this.pack = pack;
    this.cards = new Map(cards.map((v) => [v.id!, v]));
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: SWADE.actionCardEditor.id,
      title: game.i18n.localize('SWADE.ActionCardEditor'),
      template: 'systems/swade/templates/action-card-editor.hbs',
      classes: ['swade', 'action-card-editor'],
      scrollY: ['.card-list'],
      width: 600,
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
    html.find('.card-face').on('click', (ev) => this._showCard(ev));
    html.find('.add-card').on('click', async () => this._createNewCard());
  }

  protected async _updateObject(event: Event, formData = {}) {
    const data = expandObject(formData);
    const cards = Object.entries(data.card) as [string, CardData][];
    for (const [id, value] of cards) {
      await this.cards.get(id)?.update({
        name: value.name,
        img: value.img,
        'flags.swade': {
          cardValue: value.cardValue,
          suitValue: value.suitValue,
          isJoker: value.suitValue === 99,
        },
      });
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

  private _showCard(event: JQuery.ClickEvent<HTMLElement>) {
    const id = event.currentTarget.dataset.id!;
    //@ts-ignore
    new ImagePopout(this.cards.get(id)?.data.img!, {
      shareable: true,
    }).render(true);
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
    if (newCard) {
      this.cards.set(newCard.id!, newCard);
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
