import SwadeGame from './interfaces/SwadeGame';
import { SWADE } from './module/config';
import SwadeCombat from './module/documents/SwadeCombat';

declare global {
  interface Game {
    dice3d: any;
    swade: SwadeGame;
  }

  interface CONFIG {
    SWADE: typeof SWADE;
  }

  interface CombatTracker {
    viewed: SwadeCombat;
  }
}
