import type { GameV2 } from './game';
import type { ScoringSystem } from './scoring-system';

export interface PersistedStateV2 {
  version: 2;
  games: GameV2[];
  activeGameId: string | null;
  scoringSystems: ScoringSystem[];
  rememberedPlayerNames: string[];
}