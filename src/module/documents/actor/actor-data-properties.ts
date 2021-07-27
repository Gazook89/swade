import {
  CharacterDataSourceData,
  VehicleDataSourceData,
} from './actor-data-source';

declare global {
  interface DataConfig {
    Actor: SwadeActorDataProperties;
  }
}

export type SwadeActorDataProperties =
  | SwadeCharacterDataSource
  | SwadeNpcDataSource
  | SwadeVehicleDataSource;

interface SwadeCharacterDataSource {
  data: CharacterDataPropertiesData;
  type: 'character';
}

interface SwadeNpcDataSource {
  data: CharacterDataPropertiesData;
  type: 'npc';
}

interface SwadeVehicleDataSource {
  data: VehicleDataPropertiesData;
  type: 'vehicle';
}

type CharacterDataPropertiesData = CharacterDataSourceData & {
  stats: {
    speed: {
      adjusted: number;
    };
    scale: number;
  };
};

type VehicleDataPropertiesData = VehicleDataSourceData & {
  //add derived data here
};
