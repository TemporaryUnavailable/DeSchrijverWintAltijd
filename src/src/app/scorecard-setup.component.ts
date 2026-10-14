import { Component, inject, output, signal } from '@angular/core';
import { LucideMoveUpRight, LucideUserRoundPlus } from '@lucide/angular';
import { MaterializeSelectDirective } from './materialize-select.directive';
import { GameV2 } from './models/game';
import { GameService } from './services/game.service';
import { PlayerNameService } from './services/player-name.service';
import { ScoringSystemService } from './services/scoring-system.service';

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 7;

@Component({
  selector: 'app-scorecard-setup',
  imports: [LucideMoveUpRight, LucideUserRoundPlus, MaterializeSelectDirective],
  templateUrl: './scorecard-setup.component.html',
  styleUrl: './scorecard-setup.component.css',
})
export class ScorecardSetupComponent {
  private readonly gameService = inject(GameService);
  private readonly playerNames = inject(PlayerNameService);
  private readonly scoringSystems = inject(ScoringSystemService);

  readonly created = output<GameV2>();
  protected readonly systems = this.scoringSystems.getSystems();
  protected readonly suggestions = this.playerNames.getSuggestions();
  protected readonly selectedSystemId = signal('');
  protected readonly gameName = signal('');
  protected readonly playerDrafts = signal(['', '', '', '']);
  protected readonly message = signal('');

  protected updateSystem(value: string): void {
    this.selectedSystemId.set(value);
    this.message.set('');
  }

  protected updateName(value: string): void {
    this.gameName.set(value);
  }

  protected updatePlayer(index: number, value: string): void {
    this.playerDrafts.update((drafts) => drafts.map((name, itemIndex) => itemIndex === index ? value : name));
  }

  protected addSeat(): void {
    if (this.playerDrafts().length < MAX_PLAYERS) this.playerDrafts.update((drafts) => [...drafts, '']);
  }

  protected removeSeat(index: number): void {
    if (this.playerDrafts().length > MIN_PLAYERS) {
      this.playerDrafts.update((drafts) => drafts.filter((_, itemIndex) => itemIndex !== index));
    }
  }

  protected createGame(event: Event): void {
    event.preventDefault();
    const system = this.systems.find((item) => item.id === this.selectedSystemId());
    if (!system) {
      this.message.set('Kies een scoringssysteem.');
      return;
    }
    const names = this.playerDrafts().map((name) => name.trim());
    if (names.some((name) => !name)) {
      this.message.set('Vul alle vier of vijf spelersnamen in.');
      return;
    }
    if (!this.gameService.arePlayerNamesValid(names)) {
      this.message.set('Gebruik vier of vijf verschillende spelersnamen.');
      return;
    }

    try {
      const game = this.gameService.createScorecard(
        this.gameName(),
        names,
        this.scoringSystems.createSnapshot(system.id),
      );
      this.playerNames.remember(names);
      this.message.set('');
      this.created.emit(game);
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Scorekaart kan niet worden gemaakt.');
    }
  }
}