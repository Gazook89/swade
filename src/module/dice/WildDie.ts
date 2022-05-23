export default class WildDie extends Die {
  static get defaultTermData() {
    return {
      number: 1,
      faces: 6,
      modifiers: ['x'],
      options: { flavor: game.i18n.localize('SWADE.WildDie') },
    };
  }
  constructor(termData?: Partial<Die.TermData>) {
    termData = mergeObject(WildDie.defaultTermData, termData);
    /**
     * TODO
     * This doesn't seem to currently work due to an apparent bug in the Foundry roll API
     * which removes property from the options object during the roll evaluation
     * I'll keep it here anyway so we have it ready when the bug is fixed
     */
    const colorPreset = game.user?.getFlag('swade', 'dsnWildDie') || 'none';
    if (colorPreset !== 'none') {
      setProperty(termData, 'options.colorset', colorPreset);
    }
    super(termData);
  }
}
