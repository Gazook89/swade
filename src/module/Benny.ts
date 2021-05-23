export default class Benny extends DiceTerm {
  constructor(termData) {
    termData.faces = 2;
    super(termData);
  }

  /** @override */
  static DENOMINATION = 'b';

  getResultLabel(result: DiceTerm.Result) {
    const options = {
      '1': 'B',
      '2': 'B',
    };
    return options[result.result];
  }
}
