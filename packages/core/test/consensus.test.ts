import { describe, it, expect, beforeEach } from 'vitest';
import { ConsensusEngine } from '../src/consensus';
import { Message, Vote } from '../src/types';

describe('ConsensusEngine', () => {
  let engine: ConsensusEngine;

  beforeEach(() => {
    engine = new ConsensusEngine(3); // 3 nodes
  });

  it('should select winner when a proposal gets majority votes', () => {
    const proposals: Message[] = [
      { id: 'p1', taskId: 't1', fromNode: 'a', type: 'proposal', content: 'Plan A', timestamp: new Date() },
      { id: 'p2', taskId: 't1', fromNode: 'b', type: 'proposal', content: 'Plan B', timestamp: new Date() },
    ];

    const votes: Vote[] = [
      { nodeId: 'a', taskId: 't1', proposalMessageId: 'p1' },
      { nodeId: 'b', taskId: 't1', proposalMessageId: 'p1' },
      { nodeId: 'c', taskId: 't1', proposalMessageId: 'p2' },
    ];

    const result = engine.evaluate(proposals, votes);
    expect(result).toEqual({
      winnerId: 'p1',
      consensus: true,
      round: 1,
    });
  });

  it('should return no consensus when no majority exists', () => {
    const proposals: Message[] = [
      { id: 'p1', taskId: 't1', fromNode: 'a', type: 'proposal', content: 'Plan A', timestamp: new Date() },
      { id: 'p2', taskId: 't1', fromNode: 'b', type: 'proposal', content: 'Plan B', timestamp: new Date() },
    ];

    const votes: Vote[] = [
      { nodeId: 'a', taskId: 't1', proposalMessageId: 'p1' },
      { nodeId: 'b', taskId: 't1', proposalMessageId: 'p2' },
      { nodeId: 'c', taskId: 't1', proposalMessageId: 'p2' },
    ];

    // 2 votes out of 3 IS majority for 3 nodes, so test with 4 nodes
    const engine4 = new ConsensusEngine(4);
    const result = engine4.evaluate(proposals, votes);
    // 2 votes out of 4: needs >2 for majority, so 2 is NOT majority
    expect(result.consensus).toBe(false);
  });

  it('should force decision on final round even without majority', () => {
    const proposals: Message[] = [
      { id: 'p1', taskId: 't1', fromNode: 'a', type: 'proposal', content: 'Plan A', timestamp: new Date() },
      { id: 'p2', taskId: 't1', fromNode: 'b', type: 'proposal', content: 'Plan B', timestamp: new Date() },
    ];

    const votes: Vote[] = [
      { nodeId: 'a', taskId: 't1', proposalMessageId: 'p1' },
      { nodeId: 'b', taskId: 't1', proposalMessageId: 'p2' },
    ];

    // Round 3 is the max, should force-decide by most votes (tie -> first proposal)
    const result = engine.evaluate(proposals, votes, 3);
    expect(result.consensus).toBe(true);
    expect(result.winnerId).toBe('p1'); // tie-break: first
  });

  it('should handle single node (skip consensus, direct execution)', () => {
    const singleEngine = new ConsensusEngine(1);
    const proposals: Message[] = [
      { id: 'p1', taskId: 't1', fromNode: 'a', type: 'proposal', content: 'Only plan', timestamp: new Date() },
    ];

    const result = singleEngine.evaluate(proposals, []);
    expect(result).toEqual({
      winnerId: 'p1',
      consensus: true,
      round: 1,
    });
  });

  it('should handle no proposals gracefully', () => {
    const result = engine.evaluate([], []);
    expect(result).toEqual({
      winnerId: null,
      consensus: false,
      round: 1,
    });
  });
});
