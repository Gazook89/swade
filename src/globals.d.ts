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
    canvas: never;
  }

  interface CONFIG {
    SWADE: SwadeConfig;
  }
}

export type ActorMetadata = CompendiumCollection.Metadata & { entity: 'Actor' };
export type ItemMetadata = CompendiumCollection.Metadata & { entity: 'Item' };
export type CardMetadata = CompendiumCollection.Metadata & { entity: 'Item' };
export type JournalMetadata = CompendiumCollection.Metadata & {
  entity: 'JournalEntry';
};
