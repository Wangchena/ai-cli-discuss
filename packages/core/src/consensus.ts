import { Message, Vote } from './types';

export interface ConsensusResult {
  winnerId: string | null;
  consensus: boolean;
  round: number;
}

export class ConsensusEngine {
  private totalNodes: number;

  constructor(totalNodes: number) {
    this.totalNodes = totalNodes;
  }

  evaluate(
    proposals: Message[],
    votes: Vote[],
    currentRound: number = 1,
    maxRounds: number = 3,
  ): ConsensusResult {
    // No proposals -> no consensus
    if (proposals.length === 0) {
      return { winnerId: null, consensus: false, round: currentRound };
    }

    // Single node -> auto-consensus on the only proposal
    if (this.totalNodes === 1) {
      return { winnerId: proposals[0].id, consensus: true, round: currentRound };
    }

    const majorityThreshold = Math.floor(this.totalNodes / 2) + 1;

    // Count votes per proposal
    const voteCounts: Record<string, number> = {};
    for (const proposal of proposals) {
      voteCounts[proposal.id] = 0;
    }
    for (const vote of votes) {
      if (voteCounts[vote.proposalMessageId] !== undefined) {
        voteCounts[vote.proposalMessageId]++;
      }
    }

    // Check for majority
    for (const [proposalId, count] of Object.entries(voteCounts)) {
      if (count >= majorityThreshold) {
        return { winnerId: proposalId, consensus: true, round: currentRound };
      }
    }

    // No majority -- if this is the final round, force-decide by most votes
    if (currentRound >= maxRounds) {
      let maxVotes = 0;
      let winner: string | null = null;
      for (const [proposalId, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
          maxVotes = count;
          winner = proposalId;
        }
      }
      // Tie or no votes -> pick first proposal
      return { winnerId: winner ?? proposals[0].id, consensus: true, round: currentRound };
    }

    // No consensus, more rounds available
    return { winnerId: null, consensus: false, round: currentRound };
  }
}
