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