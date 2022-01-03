declare global {
  interface SourceConfig {
    Card: SwadeCardDataSource;
  }
  interface DataConfig {
    Card: SwadeCardDataSource;
  }
}

export type SwadeCardDataSource = BaseCardDataSource | PokerCardDataSource;

interface PokerCard {
  suit: number;
  isJoker: boolean;
}

interface BaseCard {}

interface PokerCardDataSource {
  data: PokerCard;
  type: 'poker';
}

interface BaseCardDataSource {
  data: BaseCard;
  type: 'base';
}
