import { CardDataSource } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/cardData';

declare global {
  interface DocumentClassConfig {
    Cards: typeof SwadeCards;
  }
}

export default class SwadeCards extends Cards {
  async dealForInitative(
    to: Cards,
    number = 1,
    how: foundry.CONST.CARD_DRAW_MODES = foundry.CONST.CARD_DRAW_MODES.TOP,
  ): Promise<Card[]> {
    //validate
    if (this.data.type !== 'deck') {
      throw new Error('You can only deal cards for Initiative from a Deck');
    }

    // Draw from the sorted stack
    const drawn = this._drawCards(number, how) as StoredDocument<Card>[];

    // Process the card data
    const toCreate = new Array<Partial<CardDataSource>>();
    const toUpdate = new Array<Partial<CardDataSource>>();
    const toDelete = new Array<string>();
    for (const card of drawn) {
      const createData = card.toObject();
      if (!createData.origin) createData.origin = this.id;
      toCreate.push(createData);
      if (card.isHome) toUpdate.push({ _id: card.id, drawn: true });
      else toDelete.push(card.id);
    }

    // yeet the data
    await Promise.all([
      to.createEmbeddedDocuments('Card', toCreate, {
        keepId: true,
      }),
      this.deleteEmbeddedDocuments('Card', toDelete),
    ]);
    const updated = await this.updateEmbeddedDocuments('Card', toUpdate);
    return updated as StoredDocument<Card>[];
  }
}
