import { ChatSpeakerData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData';
import SwadeGame from './interfaces/SwadeGame';
import { SWADE } from './module/config';

declare global {
  interface Game {
    swade: SwadeGame;
    dice3d?: Dice3D;
  }

  interface LenientGlobalVariableTypes {
    game: never; //type is entirely irrelevant, as long as it is configured
  }

  interface CONFIG {
    SWADE: typeof SWADE;
  }

  class Dice3D {
    /**
     * Show the 3D Dice animation for the Roll made by the User.
     *
     * @param roll an instance of Roll class to show 3D dice animation.
     * @param user the user who made the roll (game.user by default).
     * @param synchronize if the animation needs to be shown to other players. Default: false
     * @param whisper list of users or userId who can see the roll, set it to null if everyone can see. Default: null
     * @param blind if the roll is blind for the current user. Default: false
     * @param chatMessageID A chatMessage ID to reveal when the roll ends. Default: null
     * @param speaker An object using the same data schema than ChatSpeakerData.
     *                Needed to hide NPCs roll when the GM enables this setting.
     * @returns when resolved true if the animation was displayed, false if not.
     */
    showForRoll(
      roll: Roll,
      user?: User,
      synchronize?: boolean,
      whisper?: Array<{ id: string } | string> | null,
      blind?: boolean,
      chatMessageID?: string,
      speaker?: ChatSpeakerData,
    ): Promise<boolean>;

    /**
     * Show the 3D Dice animation based on data configuration made by the User.
     *
     * @param data:  data containing the formula and the result to show in the 3D animation.
     * @param user: the user who made the roll (game.user by default).
     * @param synchronize: if the animation needs to be shown to other players. Default: false
     * @param whisper: list of users or userId who can see the roll, leave it empty if everyone can see.
     * @param blind: if the roll is blind for the current user
     * @returns when resolved true if the animation was displayed, false if not.
     */
    show(
      data: Dice3DShowData,
      user?: User,
      synchronize?: boolean,
      whisper?: Array<{ id: string } | string> | null,
      blind?: boolean,
    ): Promise<boolean>;
    //type box
    box: any;
    //TODO type array
    queue: Array<unknown>;
  }

  interface Dice3DShowData {
    throws: Array<Dice3DThrows>;
  }

  interface Dice3DThrows {
    dice: Array<DiceResult>;
  }

  interface DiceResult {
    result: number;
    resultLabel: number | string;
    type: string;
    vectors: Array<unknown>;
    options: unknown;
  }
}
