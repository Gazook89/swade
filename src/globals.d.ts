import { SWADE } from './module/config';
import { swadeGame } from './swade';

declare global {
  interface Game {
    dice3d: any;
    swade: typeof swadeGame;
  }

  interface CONFIG {
    SWADE: typeof SWADE;
  }
}
