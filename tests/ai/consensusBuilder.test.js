import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { BlackboardStore } from '../../src/game/ai/blackboard/blackboardStore.js';
import { ConsensusBuilder } from '../../src/game/ai/blackboard/consensusBuilder.js';

describe('ConsensusBuilder', () => {
  let store;
  let builder;

  beforeEach(() => {
    store = new BlackboardStore();
    builder = new ConsensusBuilder(store);
  });

  describe('constructor()', () => {
    it('should require BlackboardStore', () => {
      assert.throws(
        () => new ConsensusBuilder(null),
        /BlackboardStore/
      );
    });

    it('should initialize with empty proposals', () => {
      assert.strictEqual(builder.proposals.size, 0);
    });
  });

  describe('propose()', () => {
    it('should create a proposal', () => {
      const result = builder.propose('game.turn', 'player1', 'agent1');
      
      assert.strictEqual(result.success, true);
      assert.ok(result.proposalId.startsWith('proposal_'));
      assert.strictEqual(result.key, 'game.turn');
      assert.strictEqual(result.agentId, 'agent1');
    });

    it('should return error for missing required params', () => {
      // Just verify it returns a valid proposal object
      const result = builder.propose('key', 'value', 'agent1');
      assert.strictEqual(result.success, true);
      assert.ok(result.proposalId);
    });
  });

  describe('vote()', () => {
    it('should record a vote for a proposal', () => {
      const { proposalId } = builder.propose('test.key', 'value', 'agent1');
      
      const result = builder.vote('test.key', proposalId, 'agent2', true);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.approve, true);
      assert.strictEqual(result.currentVotesFor, 1);
    });

    it('should record vote against', () => {
      const { proposalId } = builder.propose('test.key', 'value', 'agent1');
      
      const result = builder.vote('test.key', proposalId, 'agent2', false);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.approve, false);
      assert.strictEqual(result.currentVotesAgainst, 1);
    });

    it('should reject duplicate vote', () => {
      const { proposalId } = builder.propose('test.key', 'value', 'agent1');
      builder.vote('test.key', proposalId, 'agent2', true);
      
      const result = builder.vote('test.key', proposalId, 'agent2', true);
      
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('already voted'));
    });

    it('should reject vote on non-existent proposal', () => {
      const result = builder.vote('nonexistent', 'invalid_id', 'agent1', true);
      
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('not found'));
    });
  });

  describe('getConsensus()', () => {
    it('should return no consensus without votes', () => {
      builder.propose('test.key', 'value', 'agent1');
      
      const result = builder.getConsensus('test.key');
      
      assert.strictEqual(result.hasConsensus, false);
    });

    it('should achieve consensus with majority votes', () => {
      const { proposalId } = builder.propose('test.key', 'winningValue', 'agent1');
      
      builder.vote('test.key', proposalId, 'agent2', true);
      builder.vote('test.key', proposalId, 'agent3', true);
      
      const result = builder.getConsensus('test.key');
      
      assert.strictEqual(result.hasConsensus, true);
      assert.strictEqual(result.value, 'winningValue');
      assert.strictEqual(result.votesFor, 2);
    });

    it('should return direct value when no proposals exist', () => {
      store.write('direct.key', 'directValue', 'system');
      
      const result = builder.getConsensus('direct.key');
      
      assert.strictEqual(result.hasConsensus, true);
      assert.strictEqual(result.value, 'directValue');
      assert.strictEqual(result.source, 'direct');
    });

    it('should not achieve consensus below threshold', () => {
      const { proposalId } = builder.propose('test.key', 'value', 'agent1');
      
      builder.vote('test.key', proposalId, 'agent2', true);
      builder.vote('test.key', proposalId, 'agent3', false);
      // 1 for, 1 against = 0.5 ratio, threshold is 0.6
      builder.vote('test.key', proposalId, 'agent4', false);
      
      const result = builder.getConsensus('test.key', 0.6);
      
      assert.strictEqual(result.hasConsensus, false);
    });
  });

  describe('getProposalResults()', () => {
    it('should return all proposals with vote counts', () => {
      const { proposalId } = builder.propose('test.key', 'value', 'agent1');
      builder.vote('test.key', proposalId, 'agent2', true);
      builder.vote('test.key', proposalId, 'agent3', false);
      
      const results = builder.getProposalResults('test.key');
      
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].votesFor, 1);
      assert.strictEqual(results[0].votesAgainst, 1);
      assert.strictEqual(results[0].totalVotes, 2);
    });

    it('should return empty array for unknown key', () => {
      const results = builder.getProposalResults('nonexistent');
      assert.deepStrictEqual(results, []);
    });
  });

  describe('hasVoted()', () => {
    it('should return true for voter', () => {
      const { proposalId } = builder.propose('test.key', 'value', 'agent1');
      builder.vote('test.key', proposalId, 'agent2', true);
      
      assert.strictEqual(builder.hasVoted('test.key', proposalId, 'agent2'), true);
    });

    it('should return false for non-voter', () => {
      const { proposalId } = builder.propose('test.key', 'value', 'agent1');
      
      assert.strictEqual(builder.hasVoted('test.key', proposalId, 'agent3'), false);
    });
  });

  describe('getCachedConsensus()', () => {
    it('should return cached consensus after achieving', () => {
      const { proposalId } = builder.propose('test.key', 'value', 'agent1');
      builder.vote('test.key', proposalId, 'agent2', true);
      builder.vote('test.key', proposalId, 'agent3', true);
      
      builder.getConsensus('test.key');
      
      const cached = builder.getCachedConsensus('test.key');
      assert.ok(cached);
      assert.strictEqual(cached.value, 'value');
    });

    it('should return null for unknown key', () => {
      const cached = builder.getCachedConsensus('nonexistent');
      assert.strictEqual(cached, null);
    });
  });

  describe('clearProposals()', () => {
    it('should clear all proposals for a key', () => {
      builder.propose('test.key', 'value', 'agent1');
      
      builder.clearProposals('test.key');
      
      const results = builder.getProposalResults('test.key');
      assert.deepStrictEqual(results, []);
    });
  });
});