import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import * as utils from '../util';
import SwadeActiveEffect from './SwadeActiveEffect';
import SwadeCombatant from './SwadeCombatant';

interface IPickACard {
  cards: Card[];
  combatantName: string;
  oldCardId?: string;
  enableRedraw?: boolean;
  isQuickDraw?: boolean;
}

declare global {
  interface DocumentClassConfig {
    Combat: typeof SwadeCombat;
  }
}

export default class SwadeCombat extends Combat {
  /**
   * @override
   * Roll initiative for one or multiple Combatants within the Combat entity
   * @param ids A Combatant id or Array of ids for which to roll
   * @param formula A non-default initiative formula to roll. Otherwise the system default is used.
   * @param messageOptions  Additional options with which to customize created Chat Messages
   * @returns A promise which resolves to the updated Combat entity once updates are complete.
   */
  async rollInitiative(
    ids: string | string[],
    options?: InitiativeOptions,
  ): Promise<this> {
    // Structure input data
    ids = typeof ids === 'string' ? [ids] : ids;

    const combatantUpdates: Record<string, unknown>[] = [];
    const initMessages: Record<string, unknown>[] = [];
    let isRedraw = false;
    let skipMessage = false;
    const actionCardDeck = game.cards!.get(
      game.settings.get('swade', 'actionDeck'),
      { strict: true },
    );
    if (ids.length > actionCardDeck.availableCards.length) {
      ui.notifications.warn(
        game.i18n.format('SWADE.NoCardsLeft', {
          needed: ids.length,
          current: actionCardDeck.availableCards.length,
        }),
      );
      return this;
    }

    // Iterate over Combatants, performing an initiative draw for each
    for (const id of ids) {
      // Get Combatant data
      const c = this.combatants.get(id, { strict: true });
      const roundHeld = c.roundHeld;
      const inGroup = c.groupId;
      if (c.initiative !== null && !roundHeld) {
        isRedraw = true;
      }

      //Do not draw cards for defeated or holding combatants
      if (c.data.defeated || roundHeld || inGroup) continue;

      // Set up edges
      let cardsToDraw = 1;
      if (c.actor!.data.data.initiative.hasLevelHeaded) cardsToDraw = 2;
      if (c.actor!.data.data.initiative.hasImpLevelHeaded) cardsToDraw = 3;
      const hasHesitant = c.actor!.data.data.initiative.hasHesitant;
      const hasQuick = c.actor!.data.data.initiative.hasQuick;

      // Draw initiative
      let card: Card | undefined;
      if (isRedraw) {
        const oldCard = await this.findCard(c?.cardValue!, c?.suitValue!);
        const cards = await this.drawCard();
        if (oldCard) {
          cards.push(oldCard);
          card = await this.pickACard({
            cards: cards,
            combatantName: c.name,
            oldCardId: oldCard?.id!,
          });
          if (card === oldCard) {
            skipMessage = true;
          }
        } else {
          card = cards[0];
        }
      } else if (hasHesitant) {
        // Hesitant
        const cards = await this.drawCard(2);
        if (cards.some((c) => c.data.data['isJoker'])) {
          card = await this.pickACard({
            cards: cards,
            combatantName: c.name,
          });
        } else {
          //sort cards to pick the lower one
          cards.sort((a, b) => {
            const cardA = a.data.value!;
            const cardB = b.data.value!;
            const card = cardA - cardB;
            if (card !== 0) return card;
            const suitA = a.data.data['suit'];
            const suitB = b.data.data['suit'];
            const suit = suitA - suitB;
            return suit;
          });
          card = cards[0];
        }
      } else if (cardsToDraw > 1) {
        //Level Headed
        const cards = await this.drawCard(cardsToDraw);
        card = await this.pickACard({
          cards: cards,
          combatantName: c.name,
          enableRedraw: hasQuick,
          isQuickDraw: hasQuick,
        });
      } else if (hasQuick) {
        const cards = await this.drawCard();
        card = cards[0];
        const cardValue = card?.data.value!;
        //if the card value is less than 5 then pick a card otherwise use the card
        if (cardValue <= 5) {
          card = await this.pickACard({
            cards: [card],
            combatantName: c.name,
            enableRedraw: true,
            isQuickDraw: true,
          });
        }
      } else {
        //normal card draw
        const cards = await this.drawCard();
        card = cards[0];
      }

      const newflags = {
        cardValue: card?.data.value!,
        suitValue: card?.data.data['suit'],
        hasJoker: card?.data.data['isJoker'],
        cardString: card?.data.description,
      };

      const initiative = card?.data.data['suit'] + card?.data.value!;

      combatantUpdates.push({
        _id: c.id,
        initiative: initiative,
        'flags.swade': newflags,
      });
      if (c.isGroupLeader) {
        await c.setSuitValue(c.suitValue ?? 0 + 0.9);
        const followers =
          game.combats?.viewed?.combatants.filter((f) => f.groupId === c.id) ??
          [];
        let s = newflags.suitValue;
        for await (const f of followers) {
          s -= 0.02;
          combatantUpdates.push({
            _id: f.id,
            initiative: initiative,
            'flags.swade': newflags,
            'flags.swade.suitValue': s,
          });
        }
      }

      // Construct chat message data
      const template = `
            <section class="initiative-draw">
              <div class="action-card-filter-container">
                <img class="result-image" src="${card?.face?.img}">
              </div>
              <h4 class="result-text result-text-card">${card?.name}</h4>
            </section>
          `;

      const messageData = mergeObject(
        {
          speaker: {
            scene: game.scenes?.active?.id,
            actor: c.actor ? c.actor.id : null,
            token: c.token!.id,
            alias: `${c.token!.name} ${game.i18n.localize('SWADE.InitDraw')}`,
          },
          whisper:
            c.token!.data.hidden || c.hidden
              ? game!.users!.filter((u: User) => u.isGM)
              : [],
          content: template,
        },
        options?.messageOptions,
      );
      initMessages.push(messageData);
    }
    if (!combatantUpdates.length) return this;

    // Update multiple combatants
    await this.updateEmbeddedDocuments('Combatant', combatantUpdates);

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

    // Create multiple chat messages
    if (game.settings.get('swade', 'initMessage') && !skipMessage) {
      await ChatMessage.createDocuments(initMessages);
    }

    // Return the updated Combat
    return this;
  }

  _sortCombatants(a: SwadeCombatant, b: SwadeCombatant) {
    if (!a || !b) return 0;

    //shortcut for the currently active combat
    const currentCombat = game.combats?.viewed;
    const currentRound = currentCombat?.round ?? 0;

    if (
      (a.roundHeld && currentRound !== a.roundHeld) ||
      (b.roundHeld && currentRound !== b.roundHeld)
    ) {
      const isOnHoldA = a.roundHeld && (a.roundHeld ?? 0 < currentRound);
      const isOnHoldB = b.roundHeld && (b.roundHeld ?? 0 < currentRound);

      if (isOnHoldA && !isOnHoldB) {
        return -1;
      }
      if (!isOnHoldA && isOnHoldB) {
        return 1;
      }
    }

    /** Compares two tokens by initiative card */
    const cardSortCombatants = (a: SwadeCombatant, b: SwadeCombatant) => {
      const cardA = a.cardValue ?? 0;
      const cardB = b.cardValue ?? 0;
      const card = cardB - cardA;
      if (card !== 0) return card;
      const suitA = a.suitValue ?? 0;
      const suitB = b.suitValue ?? 0;
      return suitB - suitA;
    };

    /** Compares two combatants by name or - if they're the same - ID. */
    const nameSortCombatants = (a: SwadeCombatant, b: SwadeCombatant) => {
      const cn = a.name.localeCompare(b.name);
      if (cn !== 0) return cn;
      return a.id!.localeCompare(b.id!);
    };

    const finalSort = (a: SwadeCombatant, b: SwadeCombatant) => {
      if (a.data.flags?.swade && b.data.flags?.swade) {
        return cardSortCombatants(a, b);
      } else {
        return nameSortCombatants(a, b);
      }
    };

    return finalSort(a, b);
  }

  /**
   * Draws cards from the Action Cards table
   * @param count number of cards to draw
   * @returns an array with the drawn cards
   */
  async drawCard(count = 1): Promise<Card[]> {
    const deckId = game.settings.get('swade', 'actionDeck');
    const actionCardDeck = game.cards!.get(deckId, { strict: true });
    const discardPileId = game.settings.get('swade', 'actionDeckDiscardPile');
    const discardPile = game.cards!.get(discardPileId, {
      strict: true,
    });
    return actionCardDeck.dealForInitiative(
      discardPile,
      count,
      foundry.CONST.CARD_DRAW_MODES.TOP,
    );
  }

  /**
   * Asks the GM to pick a card
   * @param cards an array of cards
   * @param combatantName name of the combatant
   * @param oldCardId id of the old card, if you're picking cards for a redraw
   * @param maxCards maximum number of cards to be displayed
   * @param enableRedraw sets whether a redraw is allowed
   * @param isQuickDraw sets whether this draw includes the Quick edge
   */
  async pickACard({
    cards,
    combatantName,
    oldCardId,
    enableRedraw,
    isQuickDraw,
  }: IPickACard): Promise<Card | undefined> {
    // any card

    let immediateRedraw = false;
    if (isQuickDraw) {
      enableRedraw = !cards.some((card) => card.data.value! > 5);
    }

    const sortedCards = deepClone(cards);
    sortedCards.sort((a: Card, b: Card) => {
      const cardA = a.data.value ?? 0;
      const cardB = b.data.value ?? 0;
      const card = cardB - cardA;
      if (card !== 0) return card;
      const suitA = a.data.data['suit'] ?? 0;
      const suitB = b.data.data['suit'] ?? 0;
      return suitB - suitA;
    });
    const highestCardID = sortedCards[0].id;
    let card: Card | undefined;

    const template = 'systems/swade/templates/initiative/choose-card.hbs';
    const html = await renderTemplate(template, {
      data: {
        cards: cards,
        oldCard: oldCardId,
        highestCardID: highestCardID,
      },
    });

    const buttons: Record<string, Dialog.Button> = {
      ok: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize('SWADE.Ok'),
        callback: (html: JQuery<HTMLElement>) => {
          const choice = html.find('input[name=card]:checked');
          const cardId = choice.data('card-id') as string;
          card = cards.find((c) => c.id === cardId);
        },
      },
      redraw: {
        icon: '<i class="fas fa-plus"></i>',
        label: game.i18n.localize('SWADE.Redraw'),
        callback: () => {
          immediateRedraw = true;
        },
      },
    };

    if (!oldCardId && !enableRedraw) {
      delete buttons.redraw;
    }

    return new Promise((resolve) => {
      new Dialog({
        title: `${game.i18n.localize('SWADE.PickACard')} ${combatantName}`,
        content: html,
        buttons: buttons,
        default: 'ok',
        close: async () => {
          if (immediateRedraw) {
            const newCards = await this.drawCard();
            card = await this.pickACard({
              cards: [...cards, ...newCards],
              combatantName,
              oldCardId,
              enableRedraw,
              isQuickDraw,
            });
          }
          //if no card has been chosen then choose first in array
          if (!card) {
            if (oldCardId) {
              card = cards.find((c) => c.id === oldCardId);
            } else {
              console.log('No card was selected');
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
  findCard(cardValue: number, cardSuit: number): Card | undefined {
    const packName = game.settings.get('swade', 'actionDeck');
    const actionCardDeck = game.cards!.get(packName, { strict: true });
    return actionCardDeck.cards.find(
      (c) =>
        c.data.type === 'poker' &&
        c.data.value === cardValue &&
        c.data.data['suit'] === cardSuit,
    );
  }

  async resetAll() {
    const updates = this._getInitResetUpdates();
    await this.updateEmbeddedDocuments('Combatant', updates);
    return this.update({ turn: 0 });
  }

  async startCombat() {
    //Init autoroll
    if (game.settings.get('swade', 'autoInit')) {
      const combatantIds = this.combatants
        .filter((c) => c.initiative === null)
        .map((c) => c.id!);
      await this.rollInitiative(combatantIds);
    }
    return super.startCombat();
  }

  //FIXME return once types are maybe a bit more lenient
  //@ts-expect-error The types are a bit too strict here
  async nextTurn() {
    const currentTurn = this.turn as number;
    const nextTurn = currentTurn + 1;
    const currentTurnEffects = this.turns[currentTurn].actor?.effects.values();
    const currentTurnEndExpirations = new Array<SwadeActiveEffect>();
    for (const fx of currentTurnEffects ?? []) {
      const expiration = fx.getFlag('swade', 'expiration');
      const endAutoExpire =
        expiration ===
        CONFIG.SWADE.CONST.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto;
      const endPromptExpire =
        expiration ===
        CONFIG.SWADE.CONST.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt;
      const expiresAtEndOfTurn = endAutoExpire || endPromptExpire;
      const startRound = getProperty(fx, 'data.duration.startRound');
      const startTurn = getProperty(fx, 'data.duration.startTurn');
      const isNotNew =
        (startRound === this.round && startTurn < currentTurn) ||
        startRound < this.round;
      const durationRounds = getProperty(fx, 'data.duration.rounds');
      const roundsPassed = this.round >= startRound + durationRounds;
      const durationEnds = !durationRounds || roundsPassed;
      const expired = expiresAtEndOfTurn && isNotNew && durationEnds;
      /**
       * Round durations are weird if the start round is before the target's turn
       * as it counts from the target's turn in the next round,
       * not the target's turn in that round.
       */
      if (startRound === this.round && startTurn < currentTurn) {
        await fx.update({ 'duration.rounds': durationRounds - 1 });
      }
      if (expired) currentTurnEndExpirations.push(fx);
    }

    for (const effect of currentTurnEndExpirations) {
      await effect.removeEffect();
    }

    if (nextTurn < this.turns.length) {
      const nextTurnEffects = this.turns[nextTurn].actor?.effects.values();
      const nextTurnStartExpirations = new Array<SwadeActiveEffect>();
      for (const fx of nextTurnEffects ?? []) {
        const expiration = fx.getFlag('swade', 'expiration');
        const startAutoExpire =
          expiration ===
          CONFIG.SWADE.CONST.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto;
        const startPromptExpire =
          expiration ===
          CONFIG.SWADE.CONST.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt;
        const expiresAtStartOfTurn = startAutoExpire || startPromptExpire;
        const startRound = getProperty(fx, 'data.duration.startRound');
        const startTurn = getProperty(fx, 'data.duration.startTurn');
        const isNotNew =
          (startRound === this.round && startTurn < nextTurn) ||
          startRound < this.round;
        const durationRounds = getProperty(fx, 'data.duration.rounds');
        const roundsPassed = this.round >= startRound + durationRounds;
        const durationEnds = !durationRounds || roundsPassed;
        const expired = expiresAtStartOfTurn && isNotNew && durationEnds;

        if (expired) nextTurnStartExpirations.push(fx);
      }

      for (const effect of nextTurnStartExpirations) {
        await effect.removeEffect();
      }
    }

    const turn = this.turn as number;
    const skip = this.settings['skipDefeated'] as boolean;
    // Determine the next turn number
    let next: number | null = null;
    if (skip) {
      for (const [i, t] of this.turns.entries()) {
        if (i <= turn) continue;
        // Skip defeated, lost turns, and followers on hold (their leaders act for them)
        if (!t.data.defeated && !t.turnLost && !(t.groupId && t.roundHeld)) {
          next = i;
          break;
        }
      }
    } else {
      next = turn + 1;
    }
    // Maybe advance to the next round
    const round = this.round;
    if (this.round === 0 || next === null || next >= this.turns.length) {
      return this.nextRound();
    }

    //update time
    let advanceTime =
      Math.max(this.turns.length - this.turn!, 0) * CONFIG.time.turnTime;
    advanceTime += CONFIG.time.roundTime;
    // Update the encounter
    return this.update(
      { round: round, turn: next },
      //FIXME return once types are updated
      //@ts-expect-error The property doesn't seem to be defined in the types
      { advanceTime },
    );
  }

  //FIXME return once types are maybe a bit more lenient
  //@ts-expect-error The types are a bit too strict here
  async nextRound() {
    if (!game.user?.isGM) {
      game.swade.sockets.newRound(this.id!);
      return;
    } else {
      const jokerDrawn = this.combatants.some((c) => c.hasJoker);

      if (jokerDrawn) {
        await utils.resetActionDeck();
        ui.notifications.info('SWADE.DeckShuffled', { localize: true });
      }
      const updates = this._getInitResetUpdates();
      await this.updateEmbeddedDocuments('Combatant', updates);
      //Init autoroll
      if (game.settings.get('swade', 'autoInit')) {
        const combatantIds = this.combatants.map((c) => c.id!);
        await this.rollInitiative(combatantIds);
      }
      await super.nextRound();

      // Process turn 0's status effects that expire at the start of the turn.
      const turnZero = this.turns[0];
      const turnZeroEffects = turnZero.actor?.effects ?? [];
      const turnZeroStartExpirations = new Array();
      for (const fx of turnZeroEffects) {
        const expiration = fx.getFlag('swade', 'expiration');
        const startAutoExpire =
          expiration ===
          CONFIG.SWADE.CONST.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto;
        const startPromptExpire =
          expiration ===
          CONFIG.SWADE.CONST.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt;
        const expiresAtStartOfTurn = startAutoExpire || startPromptExpire;
        const startRound = getProperty(fx, 'data.duration.startRound');
        const startTurn = getProperty(fx, 'data.duration.startTurn');
        const isNotNew =
          (startRound === this.round && startTurn < turnZero) ||
          startRound < this.round;
        const durationRounds = getProperty(fx, 'data.duration.rounds');
        const roundsPassed = this.round >= startRound + durationRounds;
        const durationEnds = !durationRounds || roundsPassed;
        const expired = expiresAtStartOfTurn && isNotNew && durationEnds;

        if (expired) turnZeroStartExpirations.push(fx);
      }

      for (const effect of turnZeroStartExpirations) {
        await effect.removeEffect();
      }
    }
  }

  protected _getInitResetUpdates(): Record<string, unknown>[] {
    const updates = this.combatants.map((c) => {
      const roundHeld = c.roundHeld;
      const turnLost = c.turnLost;
      const groupId = c.groupId;
      if (roundHeld) {
        if (turnLost && groupId) {
          return {
            _id: c.id,
            initiative: null,
            'flags.swade': {
              hasJoker: false,
              '-=turnLost': null,
            },
          };
        } else {
          return {
            _id: c.id,
            initiative: null,
            'flags.swade.hasJoker': false,
          };
        }
      } else if (!roundHeld || turnLost) {
        return {
          _id: c.id,
          initiative: null,
          'flags.swade': {
            suitValue: null,
            cardValue: null,
            hasJoker: false,
            cardString: '',
            turnLost: false,
          },
        };
      } else {
        return {
          _id: c.id,
        };
      }
    });
    return updates;
  }

  async _preDelete(options: DocumentModificationOptions, user: User) {
    await super._preDelete(options, user);
    const jokerDrawn = this.combatants.some((v) => v.hasJoker ?? false);

    //reset the deck when combat is ended
    if (jokerDrawn) {
      await utils.resetActionDeck();
      ui.notifications.info('SWADE.DeckShuffled', { localize: true });
    }
  }
}

interface InitiativeOptions {
  /**
   * A non-default initiative formula to roll. Otherwise the system default is used.
   * @defaultValue `null`
   */
  formula?: string | null;
  /**
   * Update the Combat turn after adding new initiative scores to keep the turn on the same Combatant.
   * @defaultValue `true`
   */
  updateTurn?: boolean;
  /**
   * Additional options with which to customize created Chat Messages
   * @defaultValue `{}`
   */
  messageOptions?: object;
}
