import { AdvanceEditor } from '../module/apps/AdvanceEditor';
import RollDialog from '../module/apps/RollDialog';
import SettingConfigurator from '../module/apps/SettingConfigurator';
import SwadeDocumentTweaks from '../module/apps/SwadeDocumentTweaks';
import CharacterSummarizer from '../module/CharacterSummarizer';
import Benny from '../module/dice/Benny';
import WildDie from '../module/dice/WildDie';
import SwadeActiveEffect from '../module/documents/SwadeActiveEffect';
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
    SwadeDocumentTweaks: typeof SwadeDocumentTweaks;
    AdvanceEditor: typeof AdvanceEditor;
    SettingConfigurator: typeof SettingConfigurator;
  };
  dice: {
    Benny: typeof Benny;
    WildDie: typeof WildDie;
  };
  CharacterSummarizer: typeof CharacterSummarizer;
  RollDialog: typeof RollDialog;
  sockets: SwadeSocketHandler;
  rollItemMacro: typeof rollItemMacro;
  migrations: typeof migrations;
  itemChatCardHelper: typeof ItemChatCardHelper;
  effectCallbacks: Collection<(effect: SwadeActiveEffect) => Promise<void>>;
}
