declare global {
  interface DocumentClassConfig {
    Combatant: typeof SwadeCombatant;
  }
}

export default class SwadeCombatant extends Combatant {
  get suitValue() {
    return this.getFlag('swade', 'suitValue') as number | undefined;
  }

  async setCardValue(cardValue: number) {
    return this.setFlag('swade', 'suitValue', cardValue);
  }

  get cardValue() {
    return this.getFlag('swade', 'cardValue') as number | undefined;
  }

  async setSuitValue(suitValue: number) {
    return this.setFlag('swade', 'suitValue', suitValue);
  }

  get hasJoker() {
    return this.getFlag('swade', 'hasJoker') as boolean | undefined;
  }

  async setJoker(joker: boolean) {
    return this.setFlag('swade', 'hasJoker', joker);
  }

  get groupId() {
    return this.getFlag('swade', 'groupId') as string | undefined;
  }

  async setGroupId(groupId: string) {
    return this.setFlag('swade', 'groupId', groupId);
  }

  get isGroupLeader() {
    return this.getFlag('swade', 'isGroupLeader') as boolean | undefined;
  }

  async setGroupLeader(groupLeader: boolean) {
    return this.setFlag('swade', 'isGroupLeader', groupLeader);
  }

  get roundHeld() {
    return this.getFlag('swade', 'roundHeld') as number | undefined;
  }

  async setRoundHeld(roundHeld: number) {
    return this.setFlag('swade', 'roundHeld', roundHeld);
  }

  get turnLost() {
    return this.getFlag('swade', 'turnLost') as boolean | undefined;
  }

  async setTurnLost(turnLost: boolean) {
    return this.setFlag('swade', 'turnLost', turnLost);
  }
}
