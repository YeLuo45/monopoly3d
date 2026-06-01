/**
 * AI Memory Layer - L0-L4 Architecture
 * 
 * Exports all memory layer classes for the multi-level AI memory system.
 */

export { L0_RawEventCache } from './l0_rawEventCache.js';
export { L1_SemanticMemory } from './l1_semanticMemory.js';
export { L2_WorkingMemory } from './l2_workingMemory.js';
export { L3_LongTermMemory } from './l3_longTermMemory.js';
export { L4_MetaCognition } from './l4_metaCognition.js';

// Semantic Embedding exports
export { SituationEncoder } from '../embedding/situationEncoder.js';
export { EmbeddingIndex } from '../embedding/embeddingIndex.js';
export { GameEmbedding } from '../embedding/gameEmbedding.js';

// Decision Pattern Analysis exports
export { DecisionPatternAnalyzer } from '../analysis/decisionPatternAnalyzer.js';
export { BehaviorTree, SelectorNode, SequenceNode, ConditionNode, ActionNode } from '../analysis/behaviorTree.js';
export { PatternVisualizer } from '../analysis/patternVisualizer.js';

// Strategy Advisor exports
export { StrategyAdvisor } from '../advisor/strategyAdvisor.js';
export { StrategyLibrary } from '../advisor/strategyLibrary.js';
export { createAdvisorData, getPhaseColor, formatConfidence } from '../advisor/advisorUI.js';

// Learning Coach exports
export { LearningCoach, LESSON_IDS } from '../coach/learningCoach.js';
export { AdaptiveDifficulty, DIFFICULTY_LEVELS } from '../coach/adaptiveDifficulty.js';
export { createCoachData, createTipData, createLessonCardData, getEncouragement } from '../coach/coachUI.js';

// Opponent Modeling exports
export { OpponentModel } from '../modeling/opponentModel.js';
export { ExploitationEngine } from '../modeling/exploitationEngine.js';
export { OpponentTracker } from '../modeling/opponentTracker.js';

// Strategy Evolution exports
export { StrategyEvolution } from '../evolution/strategyEvolution.js';
export { EvolutionConfig } from '../evolution/evolutionConfig.js';
export { createEvolutionData, createStrategyComparisonData, createFitnessChartData, createMutationTimelineData, formatStrategy, getEvolutionSummary } from '../evolution/evolutionUI.js';

// Performance Dashboard exports
export { PerformanceDashboard } from './dashboard/performanceDashboard.js';
export { MetricsAggregator } from './dashboard/metricsAggregator.js';
export { createDashboardData, formatPercent, formatPlacement, formatMoney, createAchievementCard, createMetricsComparison } from './dashboard/dashboardUI.js';