import type { RulesSnapshot } from './scoring-system';

export interface Player {
  id: string;
  name: string;
}

export interface Round {
  id: string;
  dealerId?: string;
  scores: Record<string, number>;
}

export interface Game {
  id: string;
  name: string;
  players: Player[];
  rounds: Round[];
  createdAt: string;
  updatedAt: string;
}

export type LegacyGame = Game;

export type GiftInput =
  | {
      contract: 'rik-afrik' | 'troel';
      rikkerIds: [string, string];
      tricksTakenByRikkers: number;
    }
  | {
      contract: 'abondance' | 'miserie-one' | 'miserie-open' | '13-slagen' | 'solo-slim';
      soloistId: string;
      success: boolean;
    }
  | {
      contract: 'miserie-two';
      miseriePlayerIds: [string, string];
      successes: [boolean, boolean];
    }
  | { contract: 'verzaking'; mode: 'manual-only' }
  | { contract: 'manual' };

export interface Gift {
  id: string;
  dealerId: string;
  input: GiftInput | null;
  scoreChanges: Record<string, number>;
  entryMode: 'automatic' | 'manual' | 'legacy-manual';
  manualNote?: string;
}

export interface GameV2 {
  id: string;
  name: string;
  players: Player[];
  startingScore?: 0 | 100;
  readonly rulesSnapshot: RulesSnapshot | null;
  gifts: Gift[];
  legacy: boolean;
  createdAt: string;
  updatedAt: string;
}