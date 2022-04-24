export function registerKeybindings() {
  game.keybindings.register('swade', 'openFavoriteCardsDoc', {
    name: 'SWADE.Keybindings.OpenFavoriteCards.Name',
    hint: 'SWADE.Keybindings.OpenFavoriteCards.Hint',
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    editable: [{ key: 'KeyH' }],
    onDown: (_ctx) => {
      const favoriteCards = game.user?.getFlag('swade', 'favoriteCardsDoc');
      if (!favoriteCards) {
        return ui.notifications.warn(
          'SWADE.Keybindings.OpenFavoriteCards.NoCardsWarning',
          { localize: true },
        );
      }
      game.cards?.get(favoriteCards)?.sheet?.render(true);
    },
  });

  game.keybindings.register('swade', 'manageBennies', {
    name: 'SWADE.Keybindings.Bennies.Name',
    hint: 'SWADE.Keybindings.Bennies.Hint',
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    editable: [{ key: 'KeyB' }],
    reservedModifiers: [KeyboardManager.MODIFIER_KEYS.ALT],
    onDown: (ctx) => {
      if (ctx.isAlt) {
        game.user?.getBenny();
      } else {
        game.user?.spendBenny();
      }
    },
  });
}
