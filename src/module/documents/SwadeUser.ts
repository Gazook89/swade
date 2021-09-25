declare global {
  interface DocumentClassConfig {
    User: typeof SwadeUser;
  }

  interface FlagConfig {
    User: {
      swade: {
        bennies: number;
        [key: string]: unknown;
      };
    };
  }
}

export default class SwadeUser extends User {
  get bennies() {
    if (this.isGM) {
      return this.getFlag('swade', 'bennies') ?? 0;
    } else if (this.character) {
      return this.character.bennies;
    }
    return 0;
  }

  async spendBenny() {
    if (this.isGM) {
      await this.setFlag('swade', 'bennies', this.bennies - 1);
      if (this.bennies == 0) return;
      const message = await renderTemplate(
        CONFIG.SWADE.bennies.templates.spend,
        {
          target: game.user,
          speaker: game.user,
        },
      );
      const chatData = {
        content: message,
      };
      if (game.settings.get('swade', 'notifyBennies')) {
        ChatMessage.create(chatData);
      }
      await this.setFlag('swade', 'bennies', this.bennies - 1);
      const dsnShowBennyAnimation = game.settings.get(
        'swade',
        'dsnShowBennyAnimation',
      );
      if (!!game.dice3d && dsnShowBennyAnimation) {
        const benny = await new Roll('1dB').evaluate();
        game.dice3d.showForRoll(benny, game.user, true, null, false);
      }
    } else if (this.character) {
      await this.character.spendBenny();
    }
  }

  async getBenny() {
    if (this.isGM) {
      await this.setFlag('swade', 'bennies', this.bennies + 1);
    } else if (this.character) {
      await this.character.getBenny();
    }
  }

  async refreshBennies(displayToChat = true) {
    if (this.isGM) {
      const gmBennies = game.settings.get('swade', 'gmBennies');
      await this.setFlag('swade', 'bennies', gmBennies);
      ui.players?.render(true);
    } else if (this.character) {
      await this.character.refreshBennies(displayToChat);
    }
  }
}
