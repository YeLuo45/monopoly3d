/**
 * StrategyLibrary - Pre-built strategy templates
 */
export class StrategyLibrary {
  constructor() {
    this.strategies = new Map();
    this._initBuiltIn();
  }

  _initBuiltIn() {
    this.strategies.set('aggressive_early', {
      name: 'aggressive_early',
      phase: 'early',
      desc: 'Buy aggressively in early game',
      rules: [
        { condition: (gs) => true, action: 'buy_property', weight: 1.0 },
        { condition: (gs) => gs.turn <= 3, action: 'hunt_monopoly', weight: 0.8 },
      ],
    });
    this.strategies.set('defensive_mid', {
      name: 'defensive_mid',
      phase: 'mid',
      desc: 'Avoid risky moves mid-game',
      rules: [
        { condition: (gs) => gs.playerMoney < 500, action: 'conserve_cash', weight: 1.0 },
        { condition: (gs) => gs.ownedMonopolies > 0, action: 'build_houses', weight: 0.9 },
      ],
    });
    this.strategies.set('final_push', {
      name: 'final_push',
      phase: 'late',
      desc: 'Maximize returns in late game',
      rules: [
        { condition: (gs) => true, action: 'maximize_rent', weight: 1.0 },
        { condition: (gs) => gs.playerMoney > 1000, action: 'buy_full', weight: 0.7 },
      ],
    });
    this.strategies.set('rent_focus', {
      name: 'rent_focus',
      phase: 'any',
      desc: 'Prioritize rent-generating properties',
      rules: [
        { condition: (gs) => gs.rentPotential > 0.7, action: 'buy_high_rent', weight: 1.0 },
        { condition: (gs) => gs.rentPotential > 0.4, action: 'buy_medium_rent', weight: 0.6 },
      ],
    });
    this.strategies.set('monopoly_hunt', {
      name: 'monopoly_hunt',
      phase: 'any',
      desc: 'Focus on completing color groups',
      rules: [
        { condition: (gs) => gs.colorGroupCount >= 2, action: 'complete_monopoly', weight: 1.0 },
        { condition: (gs) => gs.colorGroupCount === 1, action: 'add_to_group', weight: 0.8 },
      ],
    });
  }

  getStrategiesByPhase(phase) {
    return Array.from(this.strategies.values()).filter(s =>
      s.phase === phase || s.phase === 'any'
    );
  }

  getStrategy(name) {
    return this.strategies.get(name) || null;
  }

  listStrategies() {
    return Array.from(this.strategies.values()).map(s => ({
      name: s.name,
      desc: s.desc,
      phase: s.phase,
    }));
  }

  addCustomStrategy(template) {
    if (!template.name || !template.rules) return false;
    this.strategies.set(template.name, { ...template, custom: true });
    return true;
  }

  removeStrategy(name) {
    const s = this.strategies.get(name);
    if (!s) return false;
    if (s.custom) {
      this.strategies.delete(name);
      return true;
    }
    return false; // can't remove built-in
  }
}