import SwadeGame from './interfaces/SwadeGame';
import { SWADE } from './module/config';
import SwadeCombat from './module/documents/SwadeCombat';

declare global {
  interface Game {
    dice3d: any;
    swade: SwadeGame;
  }

  interface LenientGlobalVariableTypes {
    game: never; //type is entirely irrelevant, as long as it is configured
  }

  interface CONFIG {
    SWADE: typeof SWADE;
  }

  interface CombatTracker {
    viewed: SwadeCombat;
  }
}
