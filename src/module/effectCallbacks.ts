import SwadeActor from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';
import SwadeActiveEffect from './documents/SwadeActiveEffect';
import { getStatusEffectDataById } from './util';

export function registerEffectCallbacks() {
  const effectCallbacks = game.swade.effectCallbacks;
  effectCallbacks.set('shaken', removeShaken);
  effectCallbacks.set('stunned', removeStunned);
  effectCallbacks.set('bleeding-out', bleedOut);
}

async function removeShaken(effect: SwadeActiveEffect) {
  await new Promise((resolve) => {
    let roll: Roll<{}> | null = null;
    let processed = false;
    const buttons: Record<string, Dialog.Button> = {
      roll: {
        label: game.i18n.localize('SWADE.EffectCallbacks.Shaken.RollSpirit'),
        icon: '<i class="fas fa-dice"></i>',
        callback: async () => {
          processed = true;
          const parent = effect.parent;
          if (
            !parent ||
            parent instanceof SwadeItem ||
            parent?.data.type === 'vehicle'
          ) {
            return;
          }
          const flavor = 'Spirit Test to remove Shaken';
          roll = await parent.rollAttribute('spirit', {
            title: flavor,
            flavour: flavor,
            additionalMods: [
              {
                label: 'Unshake Modifier',
                value: parent.data.data.attributes.spirit.unShakeBonus,
              },
            ],
          });
          if ((roll?.total as number) >= 4) {
            await effect.delete();
            ui.notifications.info('SWADE.NoLongerShaken', { localize: true });
          }
          resolve(roll);
        },
      },
      benny: {
        label: game.i18n.localize('SWADE.BenniesSpend'),
        icon: '<i class="fas fa-coins"></i>',
        callback: async () => {
          processed = true;
          const parent = effect.parent;
          if (parent instanceof SwadeItem) return;
          await parent?.spendBenny();
          await effect.delete();
          resolve(roll);
        },
      },
      gmBenny: {
        label: game.i18n.localize('SWADE.BenniesSpendGM'),
        icon: '<i class="fas fa-coins"></i>',
        callback: async () => {
          processed = true;
          const parent = effect.parent;
          if (parent instanceof SwadeItem) return;
          await game.user?.spendBenny();
          await effect.delete();
          resolve(roll);
        },
      },
    };

    if (!game.user?.isGM) delete buttons.gmBenny;

    const data: Dialog.Data = {
      title: game.i18n.format('SWADE.EffectCallbacks.Shaken.Title', {
        name: effect.parent?.name,
      }),
      content: '<p>What do you want to do?</p>',
      buttons,
      default: 'roll',
      close: async () => {
        if (!processed) {
          await effect.resetDuration();
          resolve(roll);
        }
      },
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
    const options: DialogOptions = mergeObject(Dialog.defaultOptions, {
      classes: ['dialog', 'dialog-buttons-column'],
    });
    new Dialog(data, options).render(true);
  });
}

async function removeStunned(effect: SwadeActiveEffect) {
  const parent = effect.parent;
  if (!parent || parent instanceof SwadeItem) return;
  const flavour = 'Vigor Test to remove Stunned';
  const roll = await parent.rollAttribute('vigor', {
    title: flavour,
    flavour,
  });
  const result = roll?.total ?? 0;
  //no roll or failed
  if (result < 4) {
    return ui.notifications.info('Still stunned');
  }
  //normal success, still vulnerable
  if (result.between(4, 7)) {
    await effect.delete();
    const data = getStatusEffectDataById('vulnerable');
    await parent.toggleActiveEffect(data);
    return ui.notifications.info('No Longer stunned but still Vulnerable');
  }

  if (result > 7) {
    await effect.delete();
    return ui.notifications.info('Complete Recovery');
  }
}

async function bleedOut(effect: SwadeActiveEffect) {
  const parent = effect.parent;
  if (!parent || parent instanceof SwadeItem) return;

  const flavor = 'Vigor Test to resist Bleeding Out';
  const roll = await parent.rollAttribute('vigor', {
    title: flavor,
    flavour: flavor,
  });
  const result = roll?.total ?? 0;
  //death
  if (result < 4) {
    //delete existing temporary effects so that they don't interfere
    const toDelete = parent.effects
      .filter((e) => e.isTemporary)
      .map((e) => e.id!);
    await parent.deleteEmbeddedDocuments('ActiveEffect', toDelete);

    //set overlay
    const data = getStatusEffectDataById('incapacitated');
    await parent.toggleActiveEffect(data, { overlay: true });

    //mark combatant defeated in turn tracker
    const tokens = parent.getActiveTokens();
    const toUpdate = new Array<Record<string, unknown>>();
    for (const token of tokens) {
      if (!token.combatant) continue;
      toUpdate.push({ _id: token.combatant.id, defeated: true });
    }
    if (toUpdate.length) {
      await game.combat?.updateEmbeddedDocuments('Combatant', toUpdate);
    }
    return ui.notifications.info('You perish');
  }
  //hanging on
  if (result.between(4, 7)) {
    return ui.notifications.info('Your hang on');
  }

  //stabilizing
  if (result >= 8) {
    await effect.delete();
    return ui.notifications.info('You stabilize');
  }
}
