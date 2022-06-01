import SwadeItem from './documents/item/SwadeItem';
import SwadeActiveEffect from './documents/SwadeActiveEffect';

export function registerEffectCallbacks() {
  game.swade.effectCallbacks.set('shaken', unshakeCallback);
}

async function unshakeCallback(effect: SwadeActiveEffect) {
  let roll: Roll<{}> | null | undefined;
  await new Promise((resolve) =>
    new Dialog({
      title: 'Unshake',
      content: '<p>What do you want to do?</p>',
      buttons: {
        roll: {
          label: 'Roll to Unshake',
          icon: "<i class='fas fa-dice'></i>",
          callback: async () => {
            const parent = effect.parent;
            if (
              !parent ||
              parent instanceof SwadeItem ||
              parent?.data.type === 'vehicle'
            ) {
              return;
            }
            roll = await parent.rollAttribute('spirit', {
              additionalMods: [
                {
                  label: 'Unshake Modifier',
                  value: parent.data.data.attributes.spirit.unShakeBonus,
                },
              ],
            });
            if ((roll?.total as number) >= 4) {
              await effect.delete();
              ui.notifications.info('You are no longer shaken');
            }
            resolve(roll);
          },
        },
        benny: {
          label: 'Spend a Benny',
          icon: "<i class='fas fa-coins'></i>",
          callback: async () => {
            const parent = effect.parent;
            if (parent instanceof SwadeItem) return;
            await parent?.spendBenny();
            await effect.delete();
            resolve(null);
          },
        },
      },
    }).render(true),
  );
}
