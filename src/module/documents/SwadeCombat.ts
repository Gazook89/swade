import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import { SWADE } from '../config';
import { getCanvas } from '../util';
import SwadeCombatant from './SwadeCombatant';

interface IPickACard {
  cards: JournalEntry[];
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
    const actionCardDeck = game.tables!.getName(SWADE.init.cardTable);
    //@ts-ignore
    if (ids.length > actionCardDeck.results.filter((r) => !r.drawn).length) {
      ui.notifications!.warn(game.i18n.localize('SWADE.NoCardsLeft'));
      return this;
    }

    // Iterate over Combatants, performing an initiative draw for each
    for (const id of ids) {
      // Get Combatant data

      const c = this.combatants.get(id);
      const roundHeld = c!.roundHeld;
      const inGroup = c!.groupId;
      if (c!.initiative !== null && !roundHeld) {
        console.log('This must be a reroll');
        isRedraw = true;
      }

      //Do not draw cards for defeated or holding combatants
      if (c!.data.defeated || roundHeld || inGroup) continue;

      // Set up edges
      let cardsToDraw = 1;
      if (c!.actor!.data.data.initiative.hasLevelHeaded) cardsToDraw = 2;
      if (c!.actor!.data.data.initiative.hasImpLevelHeaded) cardsToDraw = 3;
      const hasHesitant = c!.actor!.data.data.initiative.hasHesitant;
      const hasQuick = c!.actor!.data.data.initiative.hasQuick;

      // Draw initiative
      let card: JournalEntry | undefined;
      if (isRedraw) {
        const oldCard = await this.findCard(c!.cardValue!, c!.suitValue!);
        const cards = await this.drawCard();
        cards.push(oldCard);
        card = await this.pickACard({
          cards: cards,
          combatantName: c!.name,
          oldCardId: oldCard.id!,
        });
        if (card === oldCard) {
          skipMessage = true;
        }
      } else if (hasHesitant) {
        // Hesitant
        const cards = await this.drawCard(2);
        if (cards.some((c) => c.getFlag('swade', 'isJoker'))) {
          card = await this.pickACard({
            cards: cards,
            combatantName: c!.name,
          });
        } else {
          //sort cards to pick the lower one
          cards.sort((a: JournalEntry, b: JournalEntry) => {
            const cardA = a.getFlag('swade', 'cardValue') as number;
            const cardB = b.getFlag('swade', 'cardValue') as number;
            const card = cardA - cardB;
            if (card !== 0) return card;
            const suitA = a.getFlag('swade', 'suitValue') as number;
            const suitB = b.getFlag('swade', 'suitValue') as number;
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
          combatantName: c!.name,
          enableRedraw: hasQuick,
          isQuickDraw: hasQuick,
        });
      } else if (hasQuick) {
        const cards = await this.drawCard();
        card = cards[0];
        const cardValue = card.getFlag('swade', 'cardValue') as number;
        //if the card value is less than 5 then pick a card otherwise use the card
        if (cardValue <= 5) {
          card = await this.pickACard({
            cards: [card],
            combatantName: c!.name,
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
        cardValue: card!.getFlag('swade', 'cardValue') as number,
        suitValue: card!.getFlag('swade', 'suitValue') as number,
        hasJoker: card!.getFlag('swade', 'isJoker') as boolean,
        cardString: card!.data.content,
      };

      const initiative =
        (card!.getFlag('swade', 'suitValue') as number) +
        (card!.getFlag('swade', 'cardValue') as number);

      combatantUpdates.push({
        _id: c!.id,
        initiative: initiative,
        'flags.swade': newflags,
      });
      if (c!.isGroupLeader) {
        await c!.setSuitValue(c!.suitValue ?? 0 + 0.9);
        const followers =
          game.combat?.combatants.filter((f) => f.groupId === c!.id) ?? [];

        const fSuitValue = newflags.suitValue + 0.89;
        for await (const follower of followers) {
          combatantUpdates.push({
            _id: follower.id,
            initiative: initiative,
            'flags.swade': newflags,
            'flags.swade.suitValue': fSuitValue,
          });
        }
      }

      // Construct chat message data
      const template = `
          <div class="table-draw">
              <ol class="table-results">
                  <li class="table-result flexrow">
                      <img class="result-image" src="${card!.data.img}">
                      <h4 class="result-text">
                        @Compendium[${card!.pack}.${card!.id}]{${card!.name}}
                      </h4>
                  </li>
              </ol>
          </div>
          `;

      const messageData = mergeObject(
        {
          speaker: {
            scene: game.scenes?.active?.id,
            actor: c!.actor ? c!.actor.id : null,
            token: c!.token!.id,
            alias: c!.token!.name,
          },
          whisper:
            c!.token!.data.hidden || c!.hidden
              ? game!.users!.filter((u: User) => u.isGM)
              : [],
          flavor: `${c!.token!.name} ${game.i18n.localize('SWADE.InitDraw')}`,
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

  /**
   * @override
   * @param a Combatant A
   * @param b Combatant B
   */
  _sortCombatants(a: SwadeCombatant, b: SwadeCombatant) {
    if (getCanvas().ready) {
      const currentRound = game.combat?.round!;
      const isOnHoldA =
        hasProperty(a, 'data.flags.swade.roundHeld') &&
        (a.roundHeld ?? 0 < currentRound);
      const isOnHoldB =
        hasProperty(b, 'data.flags.swade.roundHeld') &&
        (b.roundHeld ?? 0 < currentRound);

      if (isOnHoldA && !isOnHoldB) {
        return -1;
      }
      if (!isOnHoldA && isOnHoldB) {
        return 1;
      }

      const aFollowerGroupId = SwadeCombat._getFollowerGroupId(a);
      const bFollowerGroupId = SwadeCombat._getFollowerGroupId(b);

      // both followers, in the same group -> alpha sort
      if (
        aFollowerGroupId &&
        bFollowerGroupId &&
        aFollowerGroupId === bFollowerGroupId
      ) {
        return SwadeCombat._nameSortCombatants(a, b);
      }

      // one is a follower of the other
      if (aFollowerGroupId === b.id) return 1;
      else if (bFollowerGroupId === a.id) return -1;

      // one of them is a follower & not in the same group -> sort based on the leader instead
      if (aFollowerGroupId) a = SwadeCombat._getGroupLeaderFor(a)!;
      if (bFollowerGroupId) b = SwadeCombat._getGroupLeaderFor(b)!;

      // both leaders/not grouped -> sort based on card, or name if no cards dealt yet
      return SwadeCombat._finalSort(a, b);
    } else {
      return 0;
    }
  }

  static _finalSort(a, b) {
    if (
      hasProperty(a, 'data.flags.swade') &&
      hasProperty(b, 'data.flags.swade')
    ) {
      return SwadeCombat._cardSortCombatants(a, b)!;
    } else {
      return SwadeCombat._nameSortCombatants(a, b)!;
    }
  }

  static _getGroupLeaderFor(combatant: SwadeCombatant): SwadeCombatant {
    return game.combat?.combatants.get(
      SwadeCombat._getFollowerGroupId(combatant),
    )!;
  }

  /** Returns the group ID iff this is a follower. */
  static _getFollowerGroupId(combatant: SwadeCombatant): string {
    if (
      hasProperty(combatant, 'data.flags.swade') &&
      !combatant.isGroupLeader &&
      combatant.groupId
    ) {
      return combatant.groupId ?? '';
    }
    return '';
  }

  /** Compares two tokens by initiative card */
  // TODO: verify this, it's a cut/paste from the original code
  static _cardSortCombatants(a: SwadeCombatant, b: SwadeCombatant) {
    const cardA = a.cardValue ?? 0;
    const cardB = b.cardValue ?? 0;
    const card = cardB - cardA;
    if (card !== 0) return card;
    const suitA = a.suitValue ?? 0;
    const suitB = b.suitValue ?? 0;
    if (suitA > suitB) {
      return -1;
    }
    if (suitA < suitB) {
      return 1;
    }
    if (suitA === suitB) {
      return 0; // ???
    }
  }

  /** Compares two combatants by name or - if they're the same - ID. */
  static _nameSortCombatants(a: SwadeCombatant, b: SwadeCombatant) {
    const [an, bn] = [a.name || '', b.name || ''];
    const cn = an.localeCompare(bn);
    if (cn !== 0) return cn;
    return a.id!.localeCompare(b.id!);
  }

  //@ts-ignore
  async resetAll() {
    const updates = this._getInitResetUpdates();
    await this.updateEmbeddedDocuments('Combatant', updates);
    return this.update({ turn: 0 });
  }

  /**
   * Draws cards from the Action Cards table
   * @param count number of cards to draw
   * @returns an array with the drawn cards
   */
  async drawCard(count = 1): Promise<JournalEntry[]> {
    const packName = game.settings.get('swade', 'cardDeck') as string;
    let actionCardPack = game.packs!.get(packName)!;
    //@ts-ignore
    if (!actionCardPack || actionCardPack.index.length === 0) {
      console.warn(game.i18n.localize('SWADE.SomethingWrongWithCardComp'));
      await game.settings.set(
        'swade',
        'cardDeck',
        SWADE.init.defaultCardCompendium,
      );
      actionCardPack = game.packs!.get(SWADE.init.defaultCardCompendium)!;
    }
    const cards: JournalEntry[] = [];
    const actionCardDeck = game.tables!.getName(SWADE.init.cardTable);
    //@ts-ignore
    const draw = await actionCardDeck.drawMany(count, { displayChat: false });

    for (const result of draw.results) {
      const resultID = result.data.resultId;

      const card = (await actionCardPack.getDocument(resultID)) as JournalEntry;
      cards.push(card);
    }
    return cards;
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
  }: IPickACard): Promise<JournalEntry | undefined> {
    // any card

    let immedeateRedraw = false;
    if (isQuickDraw) {
      enableRedraw = !cards.some(
        (card) => (card.getFlag('swade', 'cardValue') as number) > 5,
      );
    }

    let card: JournalEntry | undefined;
    const template = 'systems/swade/templates/initiative/choose-card.html';
    const html = await renderTemplate(template, {
      data: {
        cards: cards,
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
          card = cards.find((c) => c.id === cardId);
        },
      },
      redraw: {
        icon: '<i class="fas fa-plus"></i>',
        label: game.i18n.localize('SWADE.Redraw'),
        callback: () => {
          immedeateRedraw = true;
        },
      },
    };

    if (!oldCardId && !enableRedraw) {
      //@ts-ignore
      delete buttons.redraw;
    }

    return new Promise((resolve) => {
      new Dialog({
        title: `${game.i18n.localize('SWADE.PickACard')} ${combatantName}`,
        content: html,
        buttons: buttons,
        default: 'ok',
        close: async () => {
          if (immedeateRedraw) {
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
  async findCard(cardValue: number, cardSuit: number): Promise<JournalEntry> {
    const packName = game.settings.get('swade', 'cardDeck') as string;
    const actionCardPack = game.packs?.get(packName);

    //@ts-ignore
    const content = (await actionCardPack?.getDocuments()) as JournalEntry[];
    return content.find(
      (c) =>
        (c.getFlag('swade', 'cardValue') as number) === cardValue &&
        (c.getFlag('swade', 'suitValue') as number) === cardSuit,
    )!;
  }

  //@ts-ignore
  async startCombat() {
    //Init autoroll
    await super.startCombat();
    if (game.settings.get('swade', 'autoInit')) {
      const combatantIds: string[] = [];
      for (const c of this.combatants.filter((c) => c.initiative === null)) {
        combatantIds.push(c.id!);
      }
      await this.rollInitiative(combatantIds);
    }
    return this;
  }

  //@ts-ignore
  async nextTurn() {
    const turn = this.turn;
    const skip = this.settings.skipDefeated;
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
    // Update the encounter
    return this.update(
      { round: round, turn: next },
      //@ts-ignore
      { advanceTime: CONFIG.time.turnTime },
    );
  }

  //@ts-ignore
  async nextRound() {
    if (!game.user!.isGM) {
      game.socket?.emit('system.swade', {
        type: 'newRound',
        combatId: this.id,
      });
      return;
    } else {
      await super.nextRound();
      const jokerDrawn = this.combatants.some((c) => c.hasJoker ?? false);

      if (jokerDrawn) {
        //@ts-ignore
        await game.tables?.getName(SWADE.init.cardTable)!.reset();
        ui.notifications?.info(game.i18n.localize('SWADE.DeckShuffled'));
      }
      const updates = this._getInitResetUpdates();
      await this.updateEmbeddedDocuments('Combatant', updates);

      //Init autoroll
      if (game.settings.get('swade', 'autoInit')) {
        const combatantIds = this.combatants.map((c) => c.id!);
        await this.rollInitiative(combatantIds);
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
      //@ts-ignore
      await game.tables!.getName(SWADE.init.cardTable)?.reset();
      ui.notifications!.info(game.i18n.localize('SWADE.DeckShuffled'));
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
  messageOptions?: object; //TODO Type properly once ChatMessage is typed
}
