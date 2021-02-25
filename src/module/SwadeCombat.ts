import { SWADE } from './config';

export default class SwadeCombat extends Combat {
  /**
   * @override
   * Roll initiative for one or multiple Combatants within the Combat entity
   * @param {Array|string} ids        A Combatant id or Array of ids for which to roll
   * @param {string|null} formula     A non-default initiative formula to roll. Otherwise the system default is used.
   * @param {Object} messageOptions   Additional options with which to customize created Chat Messages
   * @return {Promise.<Combat>}       A promise which resolves to the updated Combat entity once updates are complete.
   */
  async rollInitiative(
    ids: string[] | string,
    formula: string | null = null,
    messageOptions: any = {},
  ): Promise<Combat> {
    if (formula) console.log('Wait, why is there a formula');
    // Structure input data
    ids = typeof ids === 'string' ? [ids] : ids;

    const combatantUpdates = [];
    const initMessages = [];
    let isRedraw = false;
    let skipMessage = false;
    const actionCardDeck = game.tables.getName(CONFIG.SWADE.init.cardTable);
    if (ids.length > actionCardDeck.results.filter((r) => !r.drawn).length) {
      ui.notifications.warn(game.i18n.localize('SWADE.NoCardsLeft'));
      return;
    }

    // Iterate over Combatants, performing an initiative draw for each
    for (const id of ids) {
      // Get Combatant data
      const c = await this.getCombatant(id);
      if (c.initiative !== null) {
        console.log('This must be a reroll');
        isRedraw = true;
      }

      //Do not draw cards for defeated combatants
      if (c.defeated) continue;

      // Set up edges
      let cardsToDraw = 1;
      if (c.actor.data.data.initiative.hasLevelHeaded) cardsToDraw = 2;
      if (c.actor.data.data.initiative.hasImpLevelHeaded) cardsToDraw = 3;
      const hasHesitant = c.actor.data.data.initiative.hasHesitant;

      // Draw initiative
      let card;
      if (isRedraw) {
        const oldCard = await this.findCard(
          c.flags.swade.cardValue,
          c.flags.swade.suitValue,
        );
        const cards = await this.drawCard();
        cards.push(oldCard);
        card = await this.pickACard(cards, c.name, oldCard._id);
        if (card === oldCard) {
          skipMessage = true;
        }
      } else {
        if (hasHesitant) {
          // Hesitant
          const cards = await this.drawCard(2);
          if (cards.filter((c) => c.getFlag('swade', 'isJoker')).length > 0) {
            card = await this.pickACard(cards, c.name);
          } else {
            cards.sort((a, b) => {
              //sort cards to pick the lower one
              const cardA = a.getFlag('swade', 'cardValue');
              const cardB = b.getFlag('swade', 'cardValue');
              const card = cardA - cardB;
              if (card !== 0) return card;
              const suitA = a.getFlag('swade', 'suitValue');
              const suitB = b.getFlag('swade', 'suitValue');
              const suit = suitA - suitB;
              return suit;
            });
            card = cards[0];
          }
        } else if (cardsToDraw > 1) {
          //Level Headed
          const cards = await this.drawCard(cardsToDraw);
          card = (await this.pickACard(cards, c.name)) as any;
        } else {
          //normal card draw
          const cards = await this.drawCard();
          card = cards[0] as any;
        }
      }

      const newflags = {
        suitValue: card.getFlag('swade', 'suitValue'),
        cardValue: card.getFlag('swade', 'cardValue'),
        hasJoker: card.getFlag('swade', 'isJoker'),
        cardString: card['data']['content'],
      };
      combatantUpdates.push({
        _id: c._id,
        initiative:
          card.getFlag('swade', 'suitValue') +
          card.getFlag('swade', 'cardValue'),
        'flags.swade': newflags,
      });

      // Construct chat message data
      const cardPack = game.settings.get('swade', 'cardDeck');
      const template = `
          <div class="table-draw">
              <ol class="table-results">
                  <li class="table-result flexrow">
                      <img class="result-image" src="${card['data']['img']}">
                      <h4 class="result-text">@Compendium[${cardPack}.${card._id}]{${card.name}}</h4>
                  </li>
              </ol>
          </div>
          `;

      const messageData = mergeObject(
        {
          speaker: {
            scene: canvas.scene._id,
            actor: c.actor ? c.actor._id : null,
            token: c.token._id,
            alias: c.token.name,
          },
          whisper:
            c.token.hidden || c.hidden
              ? game.users.entities.filter((u: User) => u.isGM)
              : '',
          flavor: `${c.token.name} ${game.i18n.localize('SWADE.InitDraw')}`,
          content: template,
        },
        messageOptions,
      );
      initMessages.push(messageData);
    }
    if (!combatantUpdates.length) return this;

    // Update multiple combatants
    await this.updateEmbeddedEntity('Combatant', combatantUpdates);
    // Create multiple chat messages

    if (game.settings.get('swade', 'initiativeSound') && !skipMessage) {
      AudioHelper.play(
        {
          src: 'systems/swade/assets/card-flip.wav',
          volume: 0.8,
          autoplay: true,
          loop: false,
        },
        true,
      );
    }

    if (game.settings.get('swade', 'initMessage') && !skipMessage) {
      await ChatMessage.create(initMessages);
    }
    // Return the updated Combat
    return this;
  }

  /**
   * @override
   * @param a Combatant A
   * @param b Combatant B
   */
  _sortCombatants(a, b) {
    if (a.flags.swade && b.flags.swade) {
      const cardA = a.flags.swade.cardValue;
      const cardB = b.flags.swade.cardValue;
      const card = cardB - cardA;
      if (card !== 0) return card;
      const suitA = a.flags.swade.suitValue;
      const suitB = b.flags.swade.suitValue;
      const suit = suitB - suitA;
      return suit;
    }
    const [an, bn] = [a.token.name || '', b.token.name || ''];
    const cn = an.localeCompare(bn);
    if (cn !== 0) return cn;
    return a.tokenId - b.tokenId;
  }

  /**
   * @override
   */
  async resetAll() {
    const updates = this.data['combatants'].map((c) => {
      return {
        _id: c._id,
        initiative: null,
        flags: {
          swade: {
            suitValue: null,
            cardValue: null,
            hasJoker: false,
            cardString: null,
          },
        },
      };
    });
    await this.updateEmbeddedEntity('Combatant', updates);
    return this.update({ turn: 0 });
  }

  /**
   * Draws cards
   * @param count number of cards to draw
   */
  async drawCard(count = 1): Promise<JournalEntry[]> {
    let actionCardPack = game.packs.get(game.settings.get('swade', 'cardDeck'));
    if (
      actionCardPack === null ||
      (await actionCardPack.getIndex()).length === 0
    ) {
      console.log(
        'Something went wrong with the card compendium, switching back to default',
      );
      await game.settings.set(
        'swade',
        'cardDeck',
        CONFIG.SWADE.init.defaultCardCompendium,
      );
      actionCardPack = game.packs.get(
        game.settings.get('swade', 'cardDeck'),
      ) as Compendium;
    }
    const actionCardDeck = game.tables.getName(CONFIG.SWADE.init.cardTable);
    const packIndex = await actionCardPack.getIndex();
    const cards: JournalEntry[] = [];

    for (let i = 0; i < count; i++) {
      const drawResult = await actionCardDeck.draw({ displayChat: false });
      const lookUpCard = packIndex.find(
        (c) => c.name === drawResult.results[0].text,
      );
      cards.push(
        (await actionCardPack.getEntity(lookUpCard._id)) as JournalEntry,
      );
    }
    return cards;
  }

  /**
   * Asks the GM to pick a cards
   * @param cards an array of cards
   * @param combatantName name of the combatant
   * @param oldCardId id of the old card, if you're picking cards for a redraw
   */
  async pickACard(
    cards: JournalEntry[],
    combatantName?: string,
    oldCardId?: string,
  ): Promise<JournalEntry> {
    // any card

    let immedeateRedraw = false;

    // sort the cards for display
    const sortedCards = cards.sort((a: JournalEntry, b: JournalEntry) => {
      const cardA = a.getFlag('swade', 'cardValue') as number;
      const cardB = b.getFlag('swade', 'cardValue') as number;
      const card = cardB - cardA;
      if (card !== 0) return card;
      const suitA = a.getFlag('swade', 'suitValue') as number;
      const suitB = b.getFlag('swade', 'suitValue') as number;
      const suit = suitB - suitA;
      return suit;
    });
    let card = null;
    const template = 'systems/swade/templates/initiative/choose-card.html';
    const html = await renderTemplate(template, {
      data: {
        cards: sortedCards,
        oldCard: oldCardId,
      },
    });

    const buttons = {
      ok: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize('SWADE.Ok'),
        callback: (html: JQuery<HTMLElement>) => {
          const choice = html.find('input[name=card]:checked');
          const cardId = choice.data('card-id') as string;
          if (typeof cardId !== 'undefined') {
            card = cards.find((c) => c._id === cardId);
          }
        },
      },
    };

    if (oldCardId) {
      buttons['redraw'] = {
        icon: '<i class="fas fa-redo"></i>',
        label: game.i18n.localize('SWADE.Redraw'),
        callback: () => {
          immedeateRedraw = true;
        },
      };
    }

    return new Promise((resolve) => {
      new Dialog({
        title: `${game.i18n.localize('SWADE.PickACard')} ${combatantName}`,
        content: html,
        buttons: buttons,
        close: async () => {
          if (immedeateRedraw) {
            const newCard = await this.drawCard();
            const newCards = [...cards, ...newCard];
            card = await this.pickACard(newCards, combatantName, oldCardId);
          }
          //if no card has been chosen then choose first in array
          if (card === null || typeof card === 'undefined') {
            if (oldCardId) {
              card = cards.find((c) => c._id === oldCardId);
            } else {
              console.log('no card selected');
              card = cards[0]; //If no card was selected, assign the first card that was drawn
            }
          }
          resolve(card);
        },
      }).render(true);
    });
  }

  /**
   * Find a card from the deck based on it's suit and value
   * @param cardValue
   * @param cardSuit
   */
  async findCard(cardValue: number, cardSuit: number): Promise<JournalEntry> {
    const actionCardPack = game.packs.get(
      game.settings.get('swade', 'cardDeck'),
    );
    const content = (await actionCardPack.getContent()) as JournalEntry[];
    return content.find(
      (c) =>
        c.getFlag('swade', 'cardValue') === cardValue &&
        c.getFlag('swade', 'suitValue') === cardSuit,
    );
  }

  /**
   * @override
   */
  async nextRound() {
    if (!game.user.isGM) {
      game.socket.emit('system.swade', { type: 'newRound', combatId: this.id });
    } else {
      super.nextRound();
      const jokerDrawn = this.combatants.some((v) =>
        getProperty(v, 'flags.swade.hasJoker'),
      );
      if (jokerDrawn) {
        await game.tables.getName(SWADE.init.cardTable).reset();
        ui.notifications.info('Card Deck automatically reset');
      }
      const resetComs = this.combatants.map((c) => {
        c.initiative = null;
        c.hasRolled = false;
        c.flags = {
          swade: {
            cardValue: null,
            suitValue: null,
            hasJoker: null,
            cardString: null,
          },
        };
        return c;
      });
      await this.update({ combatants: resetComs });

      //Init autoroll
      if (game.settings.get('swade', 'autoInit')) {
        const combatantIds = this.combatants.map((c) => c._id);
        await this.rollInitiative(combatantIds);
      }
    }
    return this as Combat;
  }
}
