import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucidePen, LucideToilet, LucideX } from '@lucide/angular';
import { calculateTotals } from './score-rules';
import { Game, GameV2, Gift, Round } from './models/game';
import { GameService } from './services/game.service';

@Component({
  selector: 'app-score-table',
  standalone: true,
  imports: [LucidePen, LucideToilet, LucideX],
  templateUrl: './score-table.component.html',
})
export class ScoreTableComponent {
  @Input({ required: true }) game!: Game | GameV2;
  @Input({ required: true }) totals!: Record<string, number>;
  @Input({ required: true }) leaders!: string[];
  @Input() showGiftLabels = false;
  @Input() showScoreChanges = false;
  @Input() showEditControls = false;
  @Output() readonly removeRound = new EventEmitter<string>();
  @Output() readonly startRound = new EventEmitter<void>();
  @Output() readonly editGift = new EventEmitter<string>();
  @Output() readonly removeGift = new EventEmitter<string>();
  @Output() readonly undoLatestGift = new EventEmitter<void>();

  constructor(private readonly gameService: GameService) {}

  isDealer(round: Round, roundIndex: number, playerId: string): boolean {
    return this.gameService.resolveDealerId(this.legacyGame(), round, roundIndex) === playerId;
  }

  scoreAfterRound(roundIndex: number, playerId: string): number {
    return calculateTotals(this.legacyGame().rounds.slice(0, roundIndex + 1), [playerId])[playerId];
  }

  isV2(): boolean {
    return 'gifts' in this.game;
  }

  legacyGame(): Game {
    return this.game as Game;
  }

  v2Game(): GameV2 {
    return this.game as GameV2;
  }

  scoreAfterGift(giftIndex: number, playerId: string): number {
    return this.startingScore() + this.v2Game().gifts
      .slice(0, giftIndex + 1)
      .reduce((total, gift) => total + (gift.scoreChanges[playerId] ?? 0), 0);
  }

  startingScore(): 0 | 100 {
    return this.gameService.getStartingScore(this.v2Game());
  }

  scoreCellLabel(playerName: string, score: number, dealer: boolean, sitsOut: boolean, scoreChange = 0): string {
    return [
      dealer ? `Dealer ${playerName}` : playerName,
      sitsOut ? 'zit uit' : null,
      scoreChange > 0 ? `gewonnen ${scoreChange} punten` : scoreChange < 0 ? `verloren ${Math.abs(scoreChange)} punten` : null,
      `score ${score}`,
    ]
      .filter((part): part is string => part !== null)
      .join(', ');
  }

  giftLabel(gift: Gift): string {
    if (gift.entryMode === 'legacy-manual') return 'Oude score';
    if (gift.entryMode === 'manual' && gift.input?.contract === 'verzaking') return 'Verzaking, handmatig';
    if (gift.entryMode === 'manual') return 'Handmatig';
    return gift.input?.contract ?? 'Automatisch';
  }

  isComplete(): boolean {
    const limit = this.gameService.getGiftLimit(this.v2Game());
    return limit !== null && this.v2Game().gifts.length >= limit;
  }

  finalStandings(): ReturnType<GameService['getStandings']> {
    return this.gameService.getStandings(this.v2Game());
  }

  requestDeleteGift(giftId: string): void {
    if (window.confirm('Deze gift verwijderen? De volgende dealers en totaalscores worden opnieuw berekend.')) {
      this.removeGift.emit(giftId);
    }
  }
}