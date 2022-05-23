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
    const colorPreset = game.user?.getFlag('swade', 'dsnWildDie') || 'none';
    if (colorPreset !== 'none') {
      setProperty(termData, 'options.colorset', colorPreset);
    }
    super(termData);
  }
}
