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
  async _onCreate(data: object, options: object, userId: string) {
    super._onCreate;
    await this.setCardValue(
      game?.combat?.combatants?.map((c) => c.id).indexOf(this.id)! + 1,
    );
    await this.setSuitValue(1);
  }

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
    return this.getFlag('swade', 'hasJoker');
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
    return this.getFlag('swade', 'isGroupLeader');
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
    return this.getFlag('swade', 'turnLost');
  }

  async setTurnLost(turnLost: boolean) {
    return this.setFlag('swade', 'turnLost', turnLost);
  }
}
