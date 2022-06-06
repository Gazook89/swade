import SwadeActiveEffect from './documents/SwadeActiveEffect';
import { isFirstGM, isFirstOwner } from './util';

export default class SwadeSocketHandler {
  identifier = 'system.swade';

  constructor() {
    this.registerSocketListeners();
  }

  /** registers all the socket listeners */
  registerSocketListeners(): void {
    game.socket?.on(this.identifier, (data) => {
      switch (data.type) {
        case 'deleteConvictionMessage':
          this._onDeleteConvictionMessage(data);
          break;
        case 'newRound':
          this._onNewRound(data);
          break;
        case 'removeStatusEffect':
          this._onRemoveStatusEffect(data);
          break;
        default:
          this._onUnknownSocket(data.type);
          break;
      }
    });
  }

  deleteConvictionMessage(messageId: string) {
    game.socket?.emit(this.identifier, {
      type: 'deleteConvictionMessage',
      messageId,
      userId: game.userId,
    });
  }

  removeStatusEffect(uuid: string) {
    game.socket?.emit(this.identifier, {
      type: 'removeStatusEffect',
      effectUUID: uuid,
    });
  }

  newRound(combatId: string) {
    game.socket?.emit(this.identifier, {
      type: 'newRound',
      combatId: combatId,
    });
  }

  private async _onRemoveStatusEffect(data: RemoveStatusEffectEvent) {
    const effect = (await fromUuid(data.effectUUID)) as SwadeActiveEffect;
    if (isFirstOwner(effect.parent)) {
      effect.promptEffectDeletion();
    }
  }

  private _onDeleteConvictionMessage(data: DeleteConvictionMessageEvent) {
    const message = game.messages?.get(data.messageId);
    //only delete the message if the user is a GM and the event emitter is one of the recipients
    if (game.user!.isGM && message?.data.whisper.includes(data.userId)) {
      message?.delete();
    }
  }

  //advance round
  private async _onNewRound(data: NewRoundEvent) {
    if (isFirstGM()) {
      game.combats?.get(data.combatId, { strict: true }).nextRound();
    }
  }

  private _onUnknownSocket(type: string) {
    console.warn(`The socket event ${type} is not supported`);
  }
}

interface EventData {
  type: string;
}

interface RemoveStatusEffectEvent extends EventData {
  effectUUID: string;
}

interface DeleteConvictionMessageEvent extends EventData {
  userId: string;
  messageId: string;
}

interface NewRoundEvent extends EventData {
  combatId: string;
}
