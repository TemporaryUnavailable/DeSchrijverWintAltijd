import { Injectable } from '@angular/core';
import { GameV2, Gift, GiftInput } from '../models/game';

type TypedGift = Gift & { input: NonNullable<Gift['input']> };

export interface ContractStatistic {
  contract: GiftInput['contract'];
  label: string;
  count: number;
  share: number;
}

export interface TrickStatistic {
  contract: 'rik-afrik' | 'troel';
  label: string;
  count: number;
  average: number | null;
  distribution: { tricks: number; count: number }[];
}

export interface OutcomeStatistic {
  contract: string;
  label: string;
  sampleLabel: string;
  attempts: number;
  successes: number;
  successRate: number;
}

export interface PartnerCombinationStatistic {
  key: string;
  players: string[];
  gameCount: number;
  averageTricks: number;
}

export interface GameStatistics {
  gameCount: number;
  giftCount: number;
  averageGiftsPerGame: number | null;
  typedGiftCount: number;
  contractCounts: ContractStatistic[];
  mostPlayed: ContractStatistic[];
  leastPlayed: ContractStatistic[];
  trickStatistics: TrickStatistic[];
  outcomeStatistics: OutcomeStatistic[];
  partnerCombinations: PartnerCombinationStatistic[];
  mostFrequentPartners: PartnerCombinationStatistic[];
  leastFrequentPartners: PartnerCombinationStatistic[];
}

const CONTRACTS: readonly { contract: GiftInput['contract']; label: string }[] = [
  { contract: 'rik-afrik', label: 'Rik/Afrik' },
  { contract: 'troel', label: 'Troel' },
  { contract: 'abondance', label: 'Abondance' },
  { contract: 'miserie-one', label: 'Miserie' },
  { contract: 'miserie-two', label: 'Twee-speler-Miserie' },
  { contract: 'miserie-open', label: 'Open Miserie' },
  { contract: '13-slagen', label: '13 slagen' },
  { contract: 'solo-slim', label: 'Solo slim' },
  { contract: 'verzaking', label: 'Verzaking' },
  { contract: 'manual', label: 'Handmatige invoer' },
];

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  summarize(games: readonly GameV2[]): GameStatistics {
    const gifts = games.flatMap((game) => game.gifts);
    const typedGifts = gifts.filter((gift): gift is TypedGift => gift.input !== null);
    const counts = new Map<GiftInput['contract'], number>();
    for (const gift of typedGifts) {
      if (gift.input) counts.set(gift.input.contract, (counts.get(gift.input.contract) ?? 0) + 1);
    }
    const contractCounts = CONTRACTS.map(({ contract, label }) => ({
      contract,
      label,
      count: counts.get(contract) ?? 0,
      share: typedGifts.length === 0 ? 0 : (counts.get(contract) ?? 0) / typedGifts.length,
    }));
    const rankedContracts = contractCounts.filter(({ contract, count }) => contract !== 'manual' && count > 0);
    const highestCount = Math.max(0, ...rankedContracts.map(({ count }) => count));
    const lowestCount = Math.min(...rankedContracts.map(({ count }) => count));
    const partnerCombinations = this.summarizePartnerCombinations(games);
    const mostGames = Math.max(0, ...partnerCombinations.map(({ gameCount }) => gameCount));
    const fewestGames = Math.min(...partnerCombinations.map(({ gameCount }) => gameCount));

    return {
      gameCount: games.length,
      giftCount: gifts.length,
      averageGiftsPerGame: games.length === 0 ? null : gifts.length / games.length,
      typedGiftCount: typedGifts.length,
      contractCounts,
      mostPlayed: rankedContracts.filter(({ count }) => count === highestCount),
      leastPlayed: rankedContracts.filter(({ count }) => count === lowestCount),
      trickStatistics: this.summarizeTricks(typedGifts),
      outcomeStatistics: this.summarizeOutcomes(typedGifts),
      partnerCombinations,
      mostFrequentPartners: partnerCombinations.filter(({ gameCount }) => gameCount === mostGames),
      leastFrequentPartners: partnerCombinations.filter(({ gameCount }) => gameCount === fewestGames),
    };
  }

  private summarizePartnerCombinations(games: readonly GameV2[]): PartnerCombinationStatistic[] {
    const combinations = new Map<string, { players: string[]; gameCount: number; tricks: number }>();
    for (const game of games) {
      for (const gift of game.gifts) {
        const input = gift.input;
        if (!input || (input.contract !== 'rik-afrik' && input.contract !== 'troel')) continue;
        const [firstId, secondId] = input.rikkerIds;
        if (firstId === secondId) continue;
        const firstPlayer = game.players.find(({ id }) => id === firstId);
        const secondPlayer = game.players.find(({ id }) => id === secondId);
        if (!firstPlayer || !secondPlayer) continue;
        const players = [firstPlayer.name, secondPlayer.name].sort((a, b) => a.localeCompare(b, 'nl'));
        const key = JSON.stringify(players);
        const combination = combinations.get(key) ?? { players, gameCount: 0, tricks: 0 };
        combination.gameCount += 1;
        combination.tricks += input.tricksTakenByRikkers;
        combinations.set(key, combination);
      }
    }

    return [...combinations.entries()]
      .map(([key, combination]) => ({
        key,
        players: combination.players,
        gameCount: combination.gameCount,
        averageTricks: combination.tricks / combination.gameCount,
      }))
      .sort((a, b) => b.gameCount - a.gameCount || a.players.join(', ').localeCompare(b.players.join(', '), 'nl'));
  }

  private summarizeTricks(gifts: readonly TypedGift[]): TrickStatistic[] {
    return (['rik-afrik', 'troel'] as const).map((contract) => {
      const matching = gifts.filter((gift) => gift.input.contract === contract);
      const distribution = Array.from({ length: 14 }, (_, tricks) => ({
        tricks,
        count: matching.filter((gift) => gift.input.contract === contract
          && gift.input.tricksTakenByRikkers === tricks).length,
      })).filter(({ count }) => count > 0);
      return {
        contract,
        label: contract === 'rik-afrik' ? 'Rik/Afrik' : 'Troel',
        count: matching.length,
        average: matching.length === 0 ? null : matching.reduce((total, gift) =>
          total + (gift.input.contract === contract ? gift.input.tricksTakenByRikkers : 0), 0) / matching.length,
        distribution,
      };
    });
  }

  private summarizeOutcomes(gifts: readonly TypedGift[]): OutcomeStatistic[] {
    const outcomes = new Map<string, { label: string; sampleLabel: string; attempts: number; successes: number }>();
    for (const gift of gifts) {
      const input = gift.input;
      if (!input) continue;
      if (input.contract === 'rik-afrik' || input.contract === 'troel') {
        const label = input.contract === 'rik-afrik' ? 'Rik/Afrik' : 'Troel';
        this.recordOutcome(outcomes, input.contract, label, 'handjes', [input.tricksTakenByRikkers >= 8]);
      } else if (input.contract === 'miserie-two') {
        this.recordOutcome(outcomes, input.contract, 'Twee-speler-Miserie', 'spelersresultaten', input.successes);
      } else if (input.contract === 'abondance' || input.contract === 'miserie-one'
        || input.contract === 'miserie-open' || input.contract === '13-slagen' || input.contract === 'solo-slim') {
        const label = CONTRACTS.find(({ contract }) => contract === input.contract)?.label ?? input.contract;
        this.recordOutcome(outcomes, input.contract, label, 'handjes', [input.success]);
      }
    }
    return [...outcomes.entries()].map(([contract, outcome]) => ({
      contract,
      ...outcome,
      successRate: outcome.attempts === 0 ? 0 : outcome.successes / outcome.attempts,
    }));
  }

  private recordOutcome(
    outcomes: Map<string, { label: string; sampleLabel: string; attempts: number; successes: number }>,
    contract: string,
    label: string,
    sampleLabel: string,
    results: readonly boolean[],
  ): void {
    const current = outcomes.get(contract) ?? { label, sampleLabel, attempts: 0, successes: 0 };
    current.attempts += results.length;
    current.successes += results.filter(Boolean).length;
    outcomes.set(contract, current);
  }
}