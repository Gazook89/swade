import RollDialog from '../module/apps/RollDialog';
import SwadeEntityTweaks from '../module/apps/SwadeEntityTweaks';
import CharacterSummarizer from '../module/CharacterSummarizer';
import ItemChatCardHelper from '../module/ItemChatCardHelper';
import * as migrations from '../module/migration';
import SwadeSocketHandler from '../module/SwadeSocketHandler';
import { rollItemMacro } from '../module/util';

export default interface SwadeGame {
  SwadeEntityTweaks: typeof SwadeEntityTweaks;
  CharacterSummarizer: typeof CharacterSummarizer;
  itemChatCardHelper: typeof ItemChatCardHelper;
  RollDialog: typeof RollDialog;
  sockets: SwadeSocketHandler | null;
  rollItemMacro: typeof rollItemMacro;
  migrations: typeof migrations;
}
