/**
 * BehaviorTree - Build and evaluate behavior trees from decision patterns
 * 
 * Implements a behavior tree structure with Selector, Sequence, Condition,
 * and Action nodes for modeling AI decision-making.
 */

export class BehaviorTree {
  /**
   * Create a behavior tree with a root node
   * @param {object} rootNode - Root node of the tree
   */
  constructor(rootNode) {
    this.rootNode = rootNode;
  }

  /**
   * Evaluate the tree with a given context
   * @param {object} context - Game context
   * @returns {object} Evaluation result with {success, action, node}
   */
  evaluate(context) {
    if (!this.rootNode) {
      return { success: false, action: null, node: null };
    }
    return this.rootNode.evaluate(context);
  }

  /**
   * Generate Graphviz DOT representation
   * @returns {string} DOT format string
   */
  toDotGraph() {
    const lines = ['digraph BehaviorTree {', '  rankdir=TB;', '  node [shape=box];'];
    
    let nodeId = 0;
    const nodeMap = new Map();

    const processNode = (node, parentId = null) => {
      if (!node) return;

      const id = `node_${nodeId++}`;
      const label = this._getNodeLabel(node);
      const shape = this._getNodeShape(node);

      lines.push(`  ${id} [label="${label}" shape=${shape}];`);
      
      if (parentId !== null) {
        lines.push(`  ${parentId} -> ${id};`);
      }

      nodeMap.set(id, node);

      // Process children
      if (node.children) {
        for (const child of node.children) {
          processNode(child, id);
        }
      }
    };

    processNode(this.rootNode);
    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Get label for a node
   * @param {object} node - Node object
   * @returns {string} Label
   */
  _getNodeLabel(node) {
    switch (node.type) {
      case 'selector': return 'Selector';
      case 'sequence': return 'Sequence';
      case 'condition': return node.name || 'Condition';
      case 'action': return node.name || 'Action';
      default: return 'Unknown';
    }
  }

  /**
   * Get DOT shape for a node type
   * @param {object} node - Node object
   * @returns {string} DOT shape
   */
  _getNodeShape(node) {
    switch (node.type) {
      case 'selector': return 'diamond';
      case 'sequence': return 'diamond';
      case 'condition': return 'ellipse';
      case 'action': return 'box';
      default: return 'box';
    }
  }

  /**
   * Build a tree from an observed pattern
   * @param {object} pattern - Pattern object
   * @returns {BehaviorTree} New behavior tree
   */
  static fromPattern(pattern) {
    if (!pattern || !pattern.type) {
      return new BehaviorTree(null);
    }

    const rootNode = this._buildNodeFromType(pattern.type);
    return new BehaviorTree(rootNode);
  }

  /**
   * Build a node based on pattern type
   * @param {string} type - Pattern type
   * @returns {object} Node object
   */
  static _buildNodeFromType(type) {
    switch (type) {
      case 'property_buy':
        return this.buildPropertyBuyTree();
      case 'rent_pay':
        return this.buildRentPayTree();
      case 'question_answer':
        return this.buildQuestionAnswerTree();
      default:
        return new ActionNode('default_action', () => ({ success: true }));
    }
  }

  /**
   * Build standard property buying decision tree
   * @returns {object} Root node
   */
  static buildPropertyBuyTree() {
    // Selector: try to buy, or skip
    const root = new SelectorNode('PropertyBuyRoot', [
      // Sequence: check if should buy
      new SequenceNode('CheckBuy', [
        new ConditionNode('HasMoney', (ctx) => ctx.playerMoney > ctx.propertyPrice),
        new ConditionNode('PropertyWorthIt', (ctx) => ctx.propertyValue > ctx.propertyPrice * 0.8),
        new ActionNode('BuyProperty', (ctx) => ({
          success: true,
          action: 'buy',
          result: `Buying ${ctx.propertyName} for ${ctx.propertyPrice}`,
        })),
      ]),
      // Default: skip
      new ActionNode('SkipProperty', () => ({
        success: true,
        action: 'skip',
        result: 'Skipping property purchase',
      })),
    ]);

    return root;
  }

  /**
   * Build rent payment decision tree
   * @returns {object} Root node
   */
  static buildRentPayTree() {
    // Selector: pay rent or negotiate
    const root = new SelectorNode('RentPayRoot', [
      // Sequence: try to pay
      new SequenceNode('TryPay', [
        new ConditionNode('CanAfford', (ctx) => ctx.playerMoney > ctx.rentAmount),
        new ActionNode('PayRent', (ctx) => ({
          success: true,
          action: 'pay',
          result: `Paying rent: ${ctx.rentAmount}`,
        })),
      ]),
      // Sequence: negotiate
      new SequenceNode('Negotiate', [
        new ConditionNode('HasNegotiationSkill', (ctx) => ctx.negotiationSkill > 0.5),
        new ActionNode('NegotiateRent', (ctx) => ({
          success: true,
          action: 'negotiate',
          result: 'Attempting to negotiate rent',
        })),
      ]),
      // Default: pay anyway
      new ActionNode('PayAnyway', (ctx) => ({
        success: true,
        action: 'pay',
        result: `Paying rent: ${ctx.rentAmount}`,
      })),
    ]);

    return root;
  }

  /**
   * Build trivia question decision tree
   * @returns {object} Root node
   */
  static buildQuestionAnswerTree() {
    // Sequence: check confidence then answer or pass
    const root = new SequenceNode('QuestionAnswer', [
      new ConditionNode('HasKnowledge', (ctx) => ctx.confidence > 0.6),
      new SelectorNode('AnswerSelector', [
        new ActionNode('AnswerCorrectly', (ctx) => ({
          success: true,
          action: 'respond',
          result: `Answering: ${ctx.answer}`,
        })),
        new ActionNode('AnswerIncorrectly', (ctx) => ({
          success: false,
          action: 'respond',
          result: 'Giving incorrect answer',
        })),
      ]),
    ]);

    // Fallback action
    const fallback = new ActionNode('PassQuestion', () => ({
      success: true,
      action: 'pass',
      result: 'Passing on question',
    }));

    // Return a selector with root sequence and fallback
    return new SelectorNode('QuestionRoot', [root, fallback]);
  }
}

// Selector Node: evaluate children until one succeeds
export class SelectorNode {
  constructor(name, children = []) {
    this.type = 'selector';
    this.name = name;
    this.children = children;
  }

  evaluate(context) {
    for (const child of this.children) {
      const result = child.evaluate(context);
      if (result.success) {
        return result;
      }
    }
    return { success: false, action: null, node: this };
  }
}

// Sequence Node: evaluate children until one fails
export class SequenceNode {
  constructor(name, children = []) {
    this.type = 'sequence';
    this.name = name;
    this.children = children;
  }

  evaluate(context) {
    let lastResult = null;
    for (const child of this.children) {
      lastResult = child.evaluate(context);
      if (!lastResult.success) {
        return lastResult;
      }
    }
    // Return the last child's result if all succeed (usually the final action)
    return lastResult || { success: true, action: null, node: this };
  }
}

// Condition Node: check a condition
export class ConditionNode {
  constructor(name, conditionFn) {
    this.type = 'condition';
    this.name = name;
    this.conditionFn = conditionFn;
  }

  evaluate(context) {
    try {
      const passed = this.conditionFn(context);
      return { 
        success: passed, 
        action: null, 
        node: this,
        conditionMet: passed,
      };
    } catch (e) {
      return { success: false, action: null, node: this, error: e.message };
    }
  }
}

// Action Node: take an action
export class ActionNode {
  constructor(name, actionFn) {
    this.type = 'action';
    this.name = name;
    this.actionFn = actionFn;
  }

  evaluate(context) {
    try {
      return {
        ...this.actionFn(context),
        node: this,
      };
    } catch (e) {
      return { success: false, action: null, node: this, error: e.message };
    }
  }
}