export function registerEffectCallbacks() {
  game.swade.effectCallbacks.set('shaken', async (effect) => {
    ui.notifications.info(
      `You're shaken from this effect: ${effect.data.label}`,
    );
  });
}
