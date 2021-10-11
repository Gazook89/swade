import CharacterSummarizer from '../module/CharacterSummarizer';
import SwadeEntityTweaks from '../module/dialog/SwadeEntityTweaks';
import ItemChatCardHelper from '../module/ItemChatCardHelper';
import * as migrations from '../module/migration';
import SwadeSocketHandler from '../module/SwadeSocketHandler';
import { rollItemMacro } from '../module/util';

export default interface SwadeGame {
  SwadeEntityTweaks: typeof SwadeEntityTweaks;
  CharacterSummarizer: typeof CharacterSummarizer;
  sockets: SwadeSocketHandler | null;
  itemChatCardHelper: typeof ItemChatCardHelper;
  rollItemMacro: typeof rollItemMacro;
  migrations: typeof migrations;
}
