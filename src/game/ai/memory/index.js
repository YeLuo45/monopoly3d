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

// Trading System exports
export { TradeEvaluator } from '../trading/tradeEvaluator.js';
export { FairTradeEngine } from '../trading/fairTradeEngine.js';
export { TradeHistory } from '../trading/tradeHistory.js';

// Auction System exports
export { AuctionAI } from './auction/auctionAI.js';
export { AuctionStrategy } from './auction/auctionStrategy.js';
export { AuctionAnalyzer } from './auction/auctionAnalyzer.js';

// Property Management AI exports
export { PropertyManagerAI } from './property/propertyManagerAI.js';
export { RentOptimizer } from './property/rentOptimizer.js';
export { PropertyValuation } from './property/propertyValuation.js';

// Mortgage Planning System exports
export { MortgagePlannerAI } from './mortgage/mortgagePlannerAI.js';
export { CashFlowAnalyzer } from './mortgage/cashFlowAnalyzer.js';
export { DebtManager } from './mortgage/debtManager.js';

// Finance / Money Management System exports
export { MoneyManagerAI } from './finance/moneyManagerAI.js';
export { FinancialTracker } from './finance/financialTracker.js';
export { BudgetOptimizer } from './finance/budgetOptimizer.js';

// Banking AI System exports
export { BankingAI } from './bank/bankingAI.js';
export { LoanManager } from './bank/loanManager.js';
export { InterestCalculator } from './bank/interestCalculator.js';

// Investment Advisor System exports
export { InvestmentAdvisorAI } from './invest/investmentAdvisorAI.js';
export { PortfolioBuilder } from './invest/portfolioBuilder.js';
export { InvestmentScreener } from './invest/investmentScreener.js';

// Economic Simulation System exports
export { MarketSimulator } from './econ/marketSimulator.js';
export { EconomicIndicator } from './econ/economicIndicator.js';
export { PriceEngine } from './econ/priceEngine.js';

// Tax Planning AI System exports
export { TaxPlanningAI } from './tax/taxPlanningAI.js';
export { TaxCalculator } from './tax/taxCalculator.js';
export { TaxCompliance } from './tax/taxCompliance.js';

// Winning Predictor System exports
export { WinningPredictorAI } from '../predict/winningPredictorAI.js';
export { GameStateEvaluator } from '../predict/gameStateEvaluator.js';
export { PerformanceTracker } from '../predict/performanceTracker.js';

// Economic System Facade exports
export { EconomicSystemFacade } from '../economicSystemFacade.js';
export { EconomicCoordinationHub } from '../economicCoordinationHub.js';
export { EconomicDashboardData } from '../economicDashboardData.js';

// Multi-Agent Coordination System exports
export { AgentCoordinator, AgentType } from './coordination/agentCoordinator.js';
export { TaskDispatcher, TaskPriority, TaskStatus } from './coordination/taskDispatcher.js';
export { CapabilityRegistry } from './coordination/capabilityRegistry.js';

// Task Queue Manager System exports
export { TaskQueueManager } from './queue/taskQueueManager.js';
export { TaskScheduler } from './queue/taskScheduler.js';
export { WorkloadBalancer } from './queue/workloadBalancer.js';

// Message Bus System exports
export { MessageBus, messageBus } from './bus/messageBus.js';
export { ChannelManager } from './bus/channelManager.js';
export { MessageRouter } from './bus/messageRouter.js';

// Blackboard System exports
export { BlackboardStore } from './blackboard/blackboardStore.js';
export { KnowledgeSource } from './blackboard/knowledgeSource.js';
export { ConsensusBuilder } from './blackboard/consensusBuilder.js';

// Orchestration System exports
export { OrchestrationEngine, WorkflowState, StepType, createStep } from './orchestrate/orchestrationEngine.js';
export { WorkflowBuilder } from './orchestrate/workflowBuilder.js';
export { StepExecutor, StepStatus, createRetryableStep, createRollbackableStep } from './orchestrate/stepExecutor.js';

// Performance Monitoring System exports
export { PerformanceMonitor } from './monitor/performanceMonitor.js';
export { ResourceTracker } from './monitor/resourceTracker.js';
export { HealthChecker } from './monitor/healthChecker.js';

// Multi-Agent System Integration exports
export { MultiAgentSystemFacade } from './multiAgentSystemFacade.js';
export { AgentSimulationEngine } from './agentSimulationEngine.js';
export { SystemDiagnostics } from './systemDiagnostics.js';

// Adaptive Learning & Tutorial System exports
export { AdaptiveLearningEngine } from './tutor/adaptiveLearningEngine.js';
export { KnowledgeGraph } from './tutor/knowledgeGraph.js';
export { TutorialContentManager } from './tutor/tutorialContentManager.js';

// Procedural Content Generation System exports
export { ProceduralGenerator } from './procgen/proceduralGenerator.js';
export { ContentTemplateLibrary } from './procgen/contentTemplateLibrary.js';
export { BalancedContentGenerator } from './procgen/balancedContentGenerator.js';

// Player Segmentation & Personalization System exports
export { PlayerSegmentor, PlayerMetrics, SEGMENT_TYPES, SEGMENT_WEIGHTS, SEGMENT_THRESHOLDS } from '../segment/playerSegmentor.js';
export { PersonalizationEngine, CONTENT_TYPES, PREFERENCE_TYPES, DEFAULT_PREFERENCES, SEGMENT_PREFERENCE_BASE } from '../segment/personalizationEngine.js';
export { AdaptiveContentMatcher, ContentItem, MATCH_WEIGHTS } from '../segment/adaptiveContentMatcher.js';

// Achievement & Progression System exports
export { AchievementManager } from './progression/achievementManager.js';
export { ProgressionSystem } from './progression/progressionSystem.js';
export { RewardDistributor } from './progression/rewardDistributor.js';