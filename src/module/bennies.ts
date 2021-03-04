import SwadeActor from './entities/SwadeActor';
import * as chat from './chat';
import { ActorType } from './enums/ActorTypeEnum';
import { SWADE } from './config';

export default class Bennies {
  static async spendEvent(ev: MouseEvent) {
    ev.preventDefault();
    const userId = (ev.target as HTMLElement).parentElement.dataset.userId;
    const user = game.users.find((user: User) => user.id == userId);
    if (user.isGM) {
      const value = user.getFlag('swade', 'bennies');
      if (value == 0) return;
      const message = await renderTemplate(SWADE.bennies.templates.spend, {
        target: game.user,
        speaker: game.user,
      });
      const chatData = {
        content: message,
      };
      if (game.settings.get('swade', 'notifyBennies')) {
        ChatMessage.create(chatData);
      }
      user.setFlag('swade', 'bennies', value - 1).then(() => {
        if (
          !!game.dice3d &&
          game.settings.get('swade', 'dsnShowBennyAnimation')
        ) {
          const benny = new Roll('1dB').roll();
          game.dice3d.showForRoll(benny, game.user, true, null, false);
        }
      });
    } else if (user.character) {
      user.character.spendBenny();
    }
  }

  /**
   * Refresh the bennies of a character
   * @param user the User the character belongs to
   * @param displayToChat display a message to chat
   *
   */
  static async refresh(user: User, displayToChat = true) {
    if (user.isGM) {
      await user.setFlag(
        'swade',
        'bennies',
        game.settings.get('swade', 'gmBennies'),
      );
      if (game.settings.get('swade', 'notifyBennies') && displayToChat) {
        const message = await renderTemplate(SWADE.bennies.templates.refresh, {
          target: user,
          speaker: game.user,
        });
        const chatData = {
          content: message,
        };
        ChatMessage.create(chatData);
      }
      ui['players'].render(true);
    }
    if (user.character) {
      (user.character as SwadeActor).refreshBennies(displayToChat);
    }
  }

  static async refreshAll() {
    for (const user of game.users.values()) {
      this.refresh(user, false);
    }

    const npcWildcardsToRefresh = game.actors.filter(
      (a: SwadeActor) =>
        !a.hasPlayerOwner && a.data.type === ActorType.NPC && a.isWildcard,
    ) as SwadeActor[];
    for (const actor of npcWildcardsToRefresh) {
      await actor.refreshBennies(false);
    }

    if (game.settings.get('swade', 'notifyBennies')) {
      const message = await renderTemplate(
        SWADE.bennies.templates.refreshAll,
        {},
      );
      const chatData = {
        content: message,
      };
      ChatMessage.create(chatData);
    }
  }

  static async giveEvent(ev: MouseEvent) {
    ev.preventDefault();
    const userId = (ev.target as HTMLElement).parentElement.dataset.userId;
    const user = game.users.find((user: User) => user.id == userId);
    if (user.isGM) {
      await user.setFlag(
        'swade',
        'bennies',
        user.getFlag('swade', 'bennies') + 1,
      );
      if (game.settings.get('swade', 'notifyBennies')) {
        chat.createGmBennyAddMessage(user, true);
      }
      ui['players'].render(true);
    } else if (user.character) {
      user.character.getBenny();
    }
  }

  private static updateBenny(ev: MouseEvent) {
    const userId = (ev.target as HTMLElement).parentElement.dataset.userId;
    const user = game.users.find((user: User) => user.id == userId);
    if (user.isGM) {
      const value = user.getFlag('swade', 'bennies');
      (ev.target as HTMLElement).innerHTML = value.toString();
    } else if (user.character) {
      (ev.target as HTMLElement).innerHTML =
        user.character.data.data.bennies.value;
    }
  }

  static append(player: HTMLElement, options: any) {
    const user = options.users.find(
      (user: User) => user.id == player.dataset.userId,
    );
    const span = document.createElement('span');
    span.classList.add('bennies-count');

    // Player view
    if (!game.user.isGM) {
      if (user.isGM) {
        span.innerHTML = user.getFlag('swade', 'bennies');
      } else if (user.character) {
        span.onmouseleave = Bennies.updateBenny;
        span.onclick = this.spendEvent;
        span.onmouseover = () => {
          span.innerHTML = '-';
        };
        span.title = game.i18n.localize('SWADE.BenniesSpend');
        span.innerHTML = user.character.data.data.bennies.value;
      } else {
        return;
      }
      player.append(span);
      return;
    }

    // GM interactive interface
    span.classList.add('bennies-gm');
    span.onmouseleave = Bennies.updateBenny;
    span.onclick = user.isGM ? this.spendEvent : this.giveEvent;
    span.onmouseover = () => {
      span.innerHTML = user.isGM ? '-' : '+';
    };
    span.title = user.isGM
      ? game.i18n.localize('SWADE.BenniesSpend')
      : game.i18n.localize('SWADE.BenniesGive');
    // Manage GM Bennies
    if (user.isGM) {
      const bennies = user.getFlag('swade', 'bennies');
      // Set bennies to number as defined in GM benny setting
      if (bennies == null) {
        user
          .setFlag('swade', 'bennies', game.settings.get('swade', 'gmBennies'))
          .then(() => {
            span.innerHTML = game.settings.get('swade', 'gmBennies').toString();
            player.append(span);
          });
      } else {
        span.innerHTML = user.getFlag('swade', 'bennies');
        player.append(span);
      }
    } else if (user.character) {
      span.innerHTML = user.character.data.data.bennies.value;
      player.append(span);
    }
  }
}
