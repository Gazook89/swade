import SwadeActor from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';
import SwadeActiveEffect from './documents/SwadeActiveEffect';

export function registerEffectCallbacks() {
  game.swade.effectCallbacks.set('shaken', unshakeCallback);
}

async function unshakeCallback(effect: SwadeActiveEffect) {
  await new Promise((resolve) => {
    let roll: Roll<{}> | null | undefined;
    const buttons: Record<string, Dialog.Button> = {
      roll: {
        label: 'Roll to Unshake',
        icon: '<i class="fas fa-dice"></i>',
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
        icon: '<i class="fas fa-coins"></i>',
        callback: async () => {
          const parent = effect.parent;
          if (parent instanceof SwadeItem) return;
          await parent?.spendBenny();
          await effect.delete();
          resolve(null);
        },
      },
      gmBenny: {
        label: 'Spend a GM Benny',
        icon: '<i class="fas fa-coins"></i>',
        callback: async () => {
          const parent = effect.parent;
          if (parent instanceof SwadeItem) return;
          await game.user?.spendBenny();
          await effect.delete();
          resolve(null);
        },
      },
    };
    if (!game.user?.isGM) {
      delete buttons.gmBenny;
    }
    const data: Dialog.Data = {
      title: 'Unshake',
      content: '<p>What do you want to do?</p>',
      buttons,
      render: (html: JQuery<HTMLElement>) => {
        const button = html.find('button[data-button="benny"]');
        const gmButton = html.find('button[data-button="gmBenny"]');
        const gmHasNoBennies = game.user?.isGM && game.user.bennies <= 0;
        const characterHasNoBennies =
          effect.parent instanceof SwadeActor && effect.parent.bennies <= 0;
        if (characterHasNoBennies) button.prop('disabled', true);
        if (gmHasNoBennies) gmButton?.prop('disabled', true);
      },
    };
    new Dialog(data).render(true);
  });
}
