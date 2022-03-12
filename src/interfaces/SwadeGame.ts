import RollDialog from '../module/apps/RollDialog';
import SwadeEntityTweaks from '../module/apps/SwadeEntityTweaks';
import CharacterSummarizer from '../module/CharacterSummarizer';
import ItemChatCardHelper from '../module/ItemChatCardHelper';
import * as migrations from '../module/migration';
import CharacterSheet from '../module/sheets/official/CharacterSheet';
import SwadeItemSheet from '../module/sheets/SwadeItemSheet';
import SwadeNPCSheet from '../module/sheets/SwadeNPCSheet';
import SwadeVehicleSheet from '../module/sheets/SwadeVehicleSheet';
import SwadeSocketHandler from '../module/SwadeSocketHandler';
import { rollItemMacro } from '../module/util';

export default interface SwadeGame {
  sheets: {
    CharacterSheet: typeof CharacterSheet;
    SwadeNPCSheet: typeof SwadeNPCSheet;
    SwadeVehicleSheet: typeof SwadeVehicleSheet;
    SwadeItemSheet: typeof SwadeItemSheet;
  };
  apps: {
    SwadeEntityTweaks: typeof SwadeEntityTweaks;
  };
  CharacterSummarizer: typeof CharacterSummarizer;
  RollDialog: typeof RollDialog;
  sockets: SwadeSocketHandler;
  rollItemMacro: typeof rollItemMacro;
  migrations: typeof migrations;
  /** Depreciations */
  /**
   * @deprecated use game.swade.apps.SwadeEntityTweaks instead
   * @since v1.1.0
   */
  SwadeEntityTweaks: typeof SwadeEntityTweaks;
  itemChatCardHelper: typeof ItemChatCardHelper;
}
