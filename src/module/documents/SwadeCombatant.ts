import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import { CombatantDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/combatantData';
import { SWADE } from '../config';
import { getCanvas } from '../util';
import SwadeUser from './SwadeUser';

declare global {
  interface DocumentClassConfig {
    Combatant: typeof SwadeCombatant;
  }

  interface FlagConfig {
    Combatant: {
      swade: {
        suitValue?: number;
        cardValue?: number;
        cardString?: string;
        hasJoker?: boolean;
        groupId?: string;
        isGroupLeader?: boolean;
        roundHeld?: number;
        turnLost?: boolean;
        [key: string]: unknown;
      };
    };
  }
}

export default class SwadeCombatant extends Combatant {
  get suitValue() {
    return this.getFlag('swade', 'suitValue');
  }

  async setCardValue(cardValue: number) {
    return this.setFlag('swade', 'cardValue', cardValue);
  }

  get cardValue() {
    return this.getFlag('swade', 'cardValue');
  }

  async setSuitValue(suitValue: number) {
    return this.setFlag('swade', 'suitValue', suitValue);
  }

  get cardString() {
    return this.getFlag('swade', 'cardString');
  }

  async setCardString(cardString: string) {
    return this.setFlag('swade', 'cardString', cardString);
  }

  get hasJoker() {
    return this.getFlag('swade', 'hasJoker') ?? false;
  }

  async setJoker(joker: boolean) {
    return this.setFlag('swade', 'hasJoker', joker);
  }

  get groupId() {
    return this.getFlag('swade', 'groupId');
  }

  async setGroupId(groupId: string) {
    return this.setFlag('swade', 'groupId', groupId);
  }

  async unsetGroupId() {
    return this.unsetFlag('swade', 'groupId');
  }

  get isGroupLeader() {
    return this.getFlag('swade', 'isGroupLeader') ?? false;
  }

  async setIsGroupLeader(groupLeader: boolean) {
    return this.setFlag('swade', 'isGroupLeader', groupLeader);
  }

  async unsetIsGroupLeader() {
    return this.unsetFlag('swade', 'isGroupLeader');
  }

  get roundHeld() {
    return this.getFlag('swade', 'roundHeld');
  }

  async setRoundHeld(roundHeld: number) {
    return this.setFlag('swade', 'roundHeld', roundHeld);
  }

  get turnLost() {
    return this.getFlag('swade', 'turnLost') ?? false;
  }

  async setTurnLost(turnLost: boolean) {
    return this.setFlag('swade', 'turnLost', turnLost);
  }

  async _preCreate(
    data: CombatantDataConstructorData,
    options: DocumentModificationOptions,
    user: User,
  ) {
    await super._preCreate(data, options, user);
    const combatants = game?.combat?.combatants.size!;
    const tokenID =
      data.tokenId instanceof TokenDocument ? data.tokenId.id : data.tokenId;
    const tokenIndex =
      getCanvas()
        .tokens?.controlled.map((t) => t.id)
        .indexOf(tokenID as string) ?? 0;
    const sortValue = tokenIndex + combatants;
    this.data.update({
      flags: {
        swade: {
          cardValue: sortValue,
          suitValue: sortValue,
        },
      },
    });
  }

  async _preUpdate(
    changed: DeepPartial<CombatantDataConstructorData>,
    options: DocumentModificationOptions,
    user: SwadeUser,
  ) {
    await super._preUpdate(changed, options, user);

    //return early if there's no flag updates
    if (!hasProperty(changed, 'flags.swade')) return;

    if (
      game.settings.get('swade', 'jokersWild') &&
      getProperty(changed, 'flags.swade.hasJoker') &&
      !hasProperty(this, 'data.flags.swade.groupId')
    ) {
      const template = await renderTemplate(SWADE.bennies.templates.joker, {
        speaker: game.user,
      });
      const isCombHostile =
        this.token &&
        this.token.data.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE;
      //Give bennies to PCs
      if (this.actor?.type === 'character') {
        await ChatMessage.create({ user: game.userId, content: template });
        //filter combatants for PCs and give them bennies
        const combatants =
          game.combat?.combatants.filter(
            (c) => c.actor!.type === 'character',
          ) ?? [];
        for (const combatant of combatants) {
          combatant.actor?.getBenny();
        }
      } else if (this.actor?.type === 'npc' && isCombHostile) {
        await ChatMessage.create({ user: game.user?.id!, content: template });
        //give all GMs a benny
        const gmUsers = game.users?.filter((u) => u.active && u.isGM)!;
        for (const gm of gmUsers) {
          await gm.getBenny();
        }

        //give all enemy wildcards a benny
        const enemyWCs =
          game.combat?.combatants.filter((c) => {
            const a = c.actor!;
            const hostile =
              c.token!.data.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE;
            return a.type === 'npc' && hostile && a.isWildcard;
          }) ?? [];
        for (const enemy of enemyWCs) {
          enemy.actor?.getBenny();
        }
      }
    }
  }
}
