import type { GameV2, LegacyGame } from './game';

export interface DerivedGameState {
  totals: Record<string, number>;
  recordedGifts: number;
  giftLimit: 12 | 15 | null;
  nextDealerId: string | null;
}

export interface TransferSnapshotV1 {
  version: 1;
  game: LegacyGame;
}

export interface TransferSnapshotV2 {
  version: 2;
  game: GameV2;
  derived: DerivedGameState;
}

export type TransferSnapshot = TransferSnapshotV1 | TransferSnapshotV2;