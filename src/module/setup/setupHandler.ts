export async function setupWorld() {
  if (!game.user?.isGM) return;
  await setupActionDeck();
  await setupDiscardPile();
}

async function setupActionDeck() {
  //check the action deck
  const actionDeckId = game.settings.get('swade', 'actionDeck');
  const actionDeck = game.cards?.get(actionDeckId);
  //return early if both the deck and the ID exist in the world
  if (actionDeckId && actionDeck) return;
  ui.notifications.info('SWADE.NoActionDeckFound', { localize: true });
  const preset = CONFIG.Cards.presets.pokerLight;
  const data = foundry.utils.fetchJsonWithTimeout(preset.src) as any;
  const cardsCls = getDocumentClass('Cards');
  const newActionDeck = await cardsCls.create(data);
  await game.settings.set('swade', 'actionDeck', newActionDeck?.id!);
  await newActionDeck?.shuffle({ chatNotification: false });
}

async function setupDiscardPile() {
  //check the action deck discard pile
  const discardPileId = game.settings.get('swade', 'actionDeckDiscardPile');
  const discardPile = game.cards?.get(discardPileId);
  //return early if both the discard pile and the ID exist in the world
  if (discardPileId && discardPile) return;
  ui.notifications.info('SWADE.NoActionDeckDiscardPileFound', {
    localize: true,
  });
  const cardsCls = getDocumentClass('Cards');
  const newDiscardPile = await cardsCls.create({
    name: 'Action Cards Discard Pile',
    type: 'pile',
  });
  await game.settings.set(
    'swade',
    'actionDeckDiscardPile',
    newDiscardPile?.id!,
  );
}
