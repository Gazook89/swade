import { SWADE } from '../config';
import { createActionCardTable } from '../util';

export class SwadeSetup {
  static async setup(): Promise<void> {
    if (!game.tables?.getName(SWADE.init.cardTable)) {
      await createActionCardTable(false, SWADE.init.defaultCardCompendium);
      ui.notifications?.info('First-Time-Setup complete');
    }
  }
}
