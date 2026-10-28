import { afterNextRender, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { getLeaderIds } from './score-rules';
import { GameV2, Gift } from './models/game';
import { PersistedStateV2 } from './models/persisted-state';
import { GameRepository } from './services/game-repository.service';
import { GameService } from './services/game.service';
import { PlayerNameService } from './services/player-name.service';
import { ScoringSystemService } from './services/scoring-system.service';
import { ScoreTableComponent } from './score-table.component';
import { NavigationComponent } from './navigation.component';
import { ScorecardSetupComponent } from './scorecard-setup.component';
import { ScoreEntryComponent } from './score-entry.component';
import { ScoringSystemsComponent } from './scoring-systems.component';
import { StatisticsComponent } from './statistics.component';
import { LucideClub, LucideDiamond, LucideEye, LucideEyeOff, LucideHeart, LucidePencil, LucidePencilOff, LucidePlus, LucideSpade, LucideTrash2 } from '@lucide/angular';

type Handedness = 'right' | 'left';
const HANDEDNESS_KEY = 'rikken-handedness';

const GIFT_TOASTS = [
  'Hie pikke de kiekes!',
  'Aqui pican los pollos!',
  'Hoog wilde Brussel zien!',
  'In de poep!',
  'Hedde gullie hier ne vuilbak?',
  'Kernfusie!',
  'Broederschap!',
  'Broederschap is hoofdzaak!',
  'Moet ik nu weeral delen?',
  'De logistiek verantwoordelijke zorgt voor de kaarten.',
  'Op het Belgisch kampioenschap...',
  'Bij de Landelijke Gilde...',
  'De schrijver wint altijd!',
  'Het is niet verboden van iemand 50 euro te geven.',
  '... and the world\'s misery',
  'Als ge zwijgt krijgt ge ook slaag.',
  'Ik zwijg niet meer!',
  'Passen op de voorhand',
  '\'k Hem goei handspel',
  'Hansrikske',
  'yolo-rikske',
  'Sonja zou fier zijn op u!',
  'De Sooi zou direct uw foto aan de muur van \'t Hemeltje hangen!',
  'Hans Van Aken!',
  'En nauw?',
  'Kopen of niet hebben!',
  'Na mutte ze no bibike kome...',
  'Een presserke'
];

const EMPTY_STATE: PersistedStateV2 = {
  version: 2,
  games: [],
  activeGameId: null,
  scoringSystems: [],
  rememberedPlayerNames: [],
};

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  imports: [ScoreTableComponent, NavigationComponent, ScorecardSetupComponent, ScoreEntryComponent, ScoringSystemsComponent, StatisticsComponent, LucidePlus, LucideTrash2, LucideEye, LucideEyeOff, LucidePencil, LucidePencilOff, LucideHeart, LucideDiamond, LucideSpade, LucideClub],
})
export class App {
  private readonly handednessDialog = viewChild.required<ElementRef<HTMLDialogElement>>('handednessDialog');
  protected readonly handednessError = signal('');
  protected readonly handedness = signal(this.loadHandedness());
  private readonly gameService = inject(GameService);
  private readonly gameRepository = inject(GameRepository);
  private readonly scoringSystems = inject(ScoringSystemService);
  private readonly playerNames = inject(PlayerNameService);
  private readonly initialLoad = this.gameRepository.loadState();
  private readonly initialState = this.initialLoad.ok ? this.initialLoad.state : EMPTY_STATE;
  protected readonly repositoryState = signal(this.initialState);
  protected readonly game = signal<GameV2 | null>(this.initialLoad.ok
    ? this.initialState.games.find((item) => item.id === this.initialState.activeGameId) ?? null
    : null);
  protected readonly archivedGames = computed(() => this.repositoryState().games);
  protected readonly sortedGames = computed(() => [...this.archivedGames()].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  ));
  protected readonly setupOpen = signal(false);
  protected readonly settingsOpen = signal(false);
  protected readonly statisticsOpen = signal(false);
  protected readonly giftDetailsVisible = signal(false);
  protected readonly tableEditMode = signal(false);
  protected readonly scoreEntryOpen = signal(false);
  protected readonly editingGift = signal<Gift | null>(null);
  protected readonly message = signal(this.initialLoad.ok ? '' : this.initialLoad.error);
  protected readonly savedAt = signal(this.game()?.updatedAt ?? '');
  protected readonly totals = computed(() => {
    const game = this.game();
    return game ? this.gameService.getTotals(game) : {};
  });
  protected readonly leaders = computed(() => getLeaderIds(this.totals()));
  protected readonly nextDealerId = computed(() => {
    const game = this.game();
    return game ? this.gameService.getNextGiftDealerId(game) : null;
  });
  protected readonly entryDealerId = computed(() => this.editingGift()?.dealerId ?? this.nextDealerId());

  constructor() {
    afterNextRender(() => {
      if (!this.handedness()) this.handednessDialog().nativeElement.showModal();
    });
  }

  private loadHandedness(): Handedness | null {
    try {
      const value = localStorage.getItem(HANDEDNESS_KEY);
      if (value === 'right' || value === 'left') return value;
      if (value !== null) this.handednessError.set('De opgeslagen handvoorkeur is ongeldig. Kies opnieuw.');
    } catch {
      this.handednessError.set('Uw handvoorkeur kan niet worden gelezen. Browseropslag is niet beschikbaar.');
    }
    return null;
  }

  protected chooseHandedness(value: Handedness): void {
    try {
      localStorage.setItem(HANDEDNESS_KEY, value);
    } catch {
      this.handednessError.set('Uw handvoorkeur kon niet worden opgeslagen. Controleer de browseropslagruimte en probeer opnieuw.');
      return;
    }
    this.handedness.set(value);
    this.handednessError.set('');
    this.handednessDialog().nativeElement.close();
  }

  protected createScorecard(game: GameV2): void {
    this.setupOpen.set(false);
    this.message.set('');
    this.saveGame(game);
  }

  protected exportGames(): void {
    const file = new Blob([JSON.stringify(this.archivedGames(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rikken-scorekaarten.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  protected addGift(): void {
    const game = this.game();
    if (!game || game.legacy || !this.nextDealerId()) return;
    this.editingGift.set(null);
    this.scoreEntryOpen.set(true);
  }

  protected toggleGiftDetails(): void {
    this.giftDetailsVisible.update((visible) => !visible);
  }

  protected toggleTableEditMode(): void {
    this.tableEditMode.update((enabled) => !enabled);
  }

  protected editGift(giftId: string): void {
    const game = this.game();
    const gift = game?.gifts.find((item) => item.id === giftId);
    if (!game || game.legacy || !gift) return;
    this.editingGift.set(gift);
    this.scoreEntryOpen.set(true);
  }

  protected saveGift(gift: Gift): void {
    const game = this.game();
    if (!game) return;
    const isNewGift = !this.editingGift();
    try {
      this.saveGame(this.gameService.saveGift(game, gift));
      this.scoreEntryOpen.set(false);
      this.editingGift.set(null);
      if (isNewGift && Math.random() < 1.0) {
        void import('@materializecss/materialize').then(({ Toast }) => {
          new Toast({
            text: GIFT_TOASTS[Math.floor(Math.random() * GIFT_TOASTS.length)],
            displayLength: 6000,
            outDuration: 600,
            classes: 'toast-quote',
          });
        }).catch(() => this.message.set('Toast kon niet worden getoond.'));
      }
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Gift kan niet worden opgeslagen.');
    }
  }

  protected cancelScoreEntry(): void {
    this.scoreEntryOpen.set(false);
    this.editingGift.set(null);
  }

  protected removeGift(giftId: string): void {
    const game = this.game();
    if (!game) return;
    this.saveGame(this.gameService.removeGift(game, giftId, true));
  }

  protected undoLatestGift(): void {
    const game = this.game();
    if (game) this.saveGame(this.gameService.undoLatestGift(game));
  }

  protected startNewGame(): void {
    this.message.set('');
    this.game.set(null);
    this.settingsOpen.set(false);
    this.statisticsOpen.set(false);
    this.persistState({ ...this.repositoryState(), activeGameId: null });
    this.setupOpen.set(true);
    this.savedAt.set('');
  }

  protected deleteCurrentGame(): void {
    const currentGame = this.game();
    if (!currentGame || !window.confirm(`Scorekaart "${currentGame.name}" verwijderen? Deze kaart wordt uit deze browser verwijderd. Andere scorekaarten blijven bewaard.`)) return;

    const state = this.repositoryState();
    this.persistState({ ...state, games: state.games.filter((item) => item.id !== currentGame.id), activeGameId: null });
    this.game.set(null);
    this.savedAt.set('');
  }

  protected showOverview(): void {
    this.game.set(null);
    this.setupOpen.set(false);
    this.settingsOpen.set(false);
    this.statisticsOpen.set(false);
    this.message.set('');
    this.persistState({ ...this.repositoryState(), activeGameId: null });
  }

  protected openGame(game: GameV2): void {
    this.game.set(game);
    this.setupOpen.set(false);
    this.settingsOpen.set(false);
    this.savedAt.set(game.updatedAt);
    this.persistState({ ...this.repositoryState(), activeGameId: game.id });
  }

  protected participantNames(game: GameV2): string {
    return game.players.map((player) => player.name).join(' · ');
  }

  protected giftCount(game: GameV2): number {
    return game.gifts.length;
  }

  protected isPlayable(game: GameV2): boolean {
    return !game.legacy && !!game.rulesSnapshot && this.gameService.getGiftLimit(game) !== null;
  }

  protected showScoringSystems(): void {
    this.setupOpen.set(false);
    this.statisticsOpen.set(false);
    this.settingsOpen.set(true);
  }

  protected showStatistics(): void {
    this.setupOpen.set(false);
    this.settingsOpen.set(false);
    this.statisticsOpen.set(true);
  }

  protected scoringSystemLabel(game: GameV2): string {
    return game.rulesSnapshot?.name ?? 'Historische kaart';
  }

  protected manualGiftCount(game: GameV2): number {
    return game.gifts.filter((gift) => gift.entryMode !== 'automatic').length;
  }

  protected formatSavedAt(value: string): string {
    return new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  protected formatCreatedAt(value: string): string {
    return new Intl.DateTimeFormat('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private saveGame(game: GameV2): void {
    const saved = { ...game, updatedAt: new Date().toISOString() };
    const state = this.repositoryState();
    const games = [...state.games.filter((item) => item.id !== saved.id), saved]
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    this.persistState({ ...state, games, activeGameId: saved.id });
    this.game.set(saved);
    this.setupOpen.set(false);
    this.savedAt.set(saved.updatedAt);
  }

  private persistState(state: PersistedStateV2): void {
    let next = state;
    try {
      const systems = this.scoringSystems.getSystems();
      const rememberedPlayerNames = this.playerNames.getSuggestions();
      next = { ...state, scoringSystems: systems, rememberedPlayerNames };
    } catch {
      this.message.set('Lokale voorkeuren konden niet worden gelezen.');
    }
    const result = this.gameRepository.saveState(next);
    this.repositoryState.set(next);
    if (!result.ok) this.message.set(result.error);
  }

}
