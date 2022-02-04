export default class Benny extends DiceTerm {
  constructor(termData: DiceTerm.TermData) {
    termData.faces = 2;
    super(termData);
  }

  /** @override */
  static DENOMINATION = 'b';

  /** @override */
  get isDeterministic(): boolean {
    return true;
  }

  /** @override */
  getResultLabel(_result: DiceTerm.Result): string {
    return 'b';
  }
}
