import { ChatSpeakerData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData';
import SwadeGame from './interfaces/SwadeGame';
import { SWADE } from './module/config';

declare global {
  interface Game {
    swade: SwadeGame;
    dice3d?: {
      showForRoll(
        roll: Roll,
        user?: User,
        synchronize?: boolean,
        whisper?: Array<{ id: string } | string> | null,
        blind?: boolean,
        chatMessageID?: string,
        speaker?: ChatSpeakerData,
      ): Promise<boolean>;
      box: any;
    };
  }

  interface LenientGlobalVariableTypes {
    game: never; //type is entirely irrelevant, as long as it is configured
  }

  interface CONFIG {
    SWADE: typeof SWADE;
  }
}
