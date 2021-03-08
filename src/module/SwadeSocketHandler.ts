export default class SwadeSocketHandler {
  SWADE = 'system.swade';

  constructor() {
    //register socket listeners
    this.registerSocketListeners();
  }

  /**
   * registers all the socket listeners
   */
  registerSocketListeners(): void {
    game.socket.on('system.swade', async (data) => {
      switch (data.type) {
        case 'deleteConvictionMessage':
          await this._onDeleteConvictionMessage(data);
          break;
        case 'newRound':
          this._onNewRound(data);
          break;
        default:
          this._onUnknownSocket();
          break;
      }
    });
  }

  deleteConvictionMessage(messageId: string) {
    game.socket.emit(this.SWADE, {
      type: 'deleteConvictionMessage',
      messageId,
      userId: game.userId,
    });
  }

  private _onDeleteConvictionMessage(data: any) {
    const message = game.messages.get(data.messageId) as ChatMessage;
    //only delete the message if the user is a GM and the event emitter is one of the recipients
    if (game.user.isGM && message.data['whisper'].includes(data.userId)) {
      message.delete();
    }
  }

  private async _onNewRound(data: any) {
    //return early if the user is not the first active GM sorted by ID
    const activeGMs: User[] = game.users
      .filter((u: User) => u.isGM && u.active)
      .sort((a: User, b: User) => a.id.localeCompare(b.id));
    if (activeGMs[0]?.id !== game.user.id) return;

    //advance round
    game.combats.get(data.combatId).nextRound();
  }

  private _onUnknownSocket() {
    console.warn(new Error('This socket event is not supported'));
  }
}
