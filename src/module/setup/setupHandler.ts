export async function setupWorld() {
  if (!game.user?.isGM) return;
  await setupActionDeck();
  await setupDiscardPile();
}

async function setupActionDeck() {
  //check the action deck
  const actionDeckId = game.settings.get('swade', 'actionDeck');
  const actionDeck = game.cards?.get(actionDeckId);
  if (!actionDeckId || !actionDeck) {
    ui.notifications?.info('SWADE.NoActionDeckFound', { localize: true });
    const preset = CONFIG.Cards.presets['actionDeckLight'];
    const data = await fetch(preset.src).then((r) => r.json());
    const newActionDeck = await CONFIG.Cards.documentClass.create(data);
    await game.settings.set('swade', 'actionDeck', newActionDeck?.id!);
  }
}

async function setupDiscardPile() {
  //check the action deck discard pile
  const discardPileId = game.settings.get('swade', 'actionDeckDiscardPile');
  const discardPile = game.cards?.get(discardPileId);
  if (!discardPileId || !discardPile) {
    ui.notifications?.info('SWADE.NoActionDeckDiscardPileFound', {
      localize: true,
    });
    const newDiscardPile = await CONFIG.Cards.documentClass.create({
      name: 'Discard Pile',
      type: 'pile',
    });
    await game.settings.set(
      'swade',
      'actionDeckDiscardPile',
      newDiscardPile?.id!,
    );
  }
}
