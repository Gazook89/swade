declare global {
  interface DocumentClassConfig {
    ActiveEffect: typeof SwadeActiveEffect;
  }
}

export default class SwadeActiveEffect extends ActiveEffect {}
