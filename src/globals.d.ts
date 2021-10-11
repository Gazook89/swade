import { Dice3D } from './interfaces/DiceSoNice';
import SwadeGame from './interfaces/SwadeGame';
import { SwadeConfig } from './module/config';

declare global {
  interface Game {
    swade: SwadeGame;
    dice3d?: Dice3D;
  }

  interface LenientGlobalVariableTypes {
    game: never; //type is entirely irrelevant, as long as it is configured
  }

  interface CONFIG {
    SWADE: SwadeConfig;
  }
}
