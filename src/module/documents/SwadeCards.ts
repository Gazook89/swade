declare global {
  interface DocumentClassConfig {
    Cards: typeof SwadeCards;
  }
}

export default class SwadeCards extends Cards {
  async dealForInitative(
    to: Cards,
    number = 1,
    options: Cards.DealOptions = { how: foundry.CONST.CARD_DRAW_MODES.TOP },
  ): Promise<StoredDocument<Card>[]> {
    const cards = this._drawCards(number, options.how);
    return [];
  }
}
