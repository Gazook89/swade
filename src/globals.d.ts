import { Dice3D } from './interfaces/DiceSoNice';
import SwadeGame from './interfaces/SwadeGame';
import { SWADE, SwadeConfig } from './module/config';

declare global {
  interface Game {
    swade: SwadeGame;
    dice3d?: Dice3D;
  }

  interface LenientGlobalVariableTypes {
    game: never; //type is entirely irrelevant, as long as it is configured
    canvas: never;
    ui: never;
  }

  interface CONFIG {
    SWADE: SwadeConfig;
  }
}

export type AbilitySubType = 'special' | 'race' | 'archetype';

export type ActorMetadata = CompendiumCollection.Metadata & { type: 'Actor' };
export type ItemMetadata = CompendiumCollection.Metadata & { type: 'Item' };
export type CardMetadata = CompendiumCollection.Metadata & { type: 'Card' };
export type JournalMetadata = CompendiumCollection.Metadata & {
  type: 'JournalEntry';
};

export type Attribute = keyof typeof SWADE.attributes;
export type LinkedAttribute = Attribute | '';
