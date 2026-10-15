import { afterNextRender, Component, computed, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { getLeaderIds } from './score-rules';
import { GameV2, Gift } from './models/game';
import { PersistedStateV2 } from './models/persisted-state';
import { GameRepository } from './services/game-repository.service';
import { GameService } from './services/game.service';
import { PlayerNameService } from './services/player-name.service';
import { ScoringSystemService } from './services/scoring-system.service';
import { ScoreTransferService } from './services/score-transfer.service';
import { ScoreTableComponent } from './score-table.component';
import { NavigationComponent } from './navigation.component';
import { ScorecardSetupComponent } from './scorecard-setup.component';
import { ScoreEntryComponent } from './score-entry.component';
import { ScoringSystemsComponent } from './scoring-systems.component';
import { LucideClub, LucideDiamond, LucideEye, LucideEyeOff, LucideHeart, LucidePencil, LucidePencilOff, LucidePlus, LucideShare2, LucideSpade, LucideTrash2 } from '@lucide/angular';

type TransferMode = 'share' | 'scan';
type Handedness = 'right' | 'left';
const HANDEDNESS_KEY = 'rikken-handedness';
interface ImportPreview { game: GameV2; collision: boolean; }

const GIFT_TOASTS = [
  'Hie pikke de kiekes!',
  'Aqui pican los pollos!',
  'Hoog wilde Brussel zien!',
  'In de poep!',
  'Hedde gullie hier ne vuilbak?',
  'Kernfusie!',
  'Broederschap!',
  'Broederschap is hoofdzaak!',
  'Gij moet delen. Nu weeral?',
  'De logistiek verantwoordelijke zorgt voor de kaarten.',
  'Op het Belgisch kampioenschap...',
  'Bij de Landelijke Gilde...',
  'De schrijver wint altijd!',
  'Het is niet verboden van iemand 50 euro te geven.'
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
  imports: [ScoreTableComponent, NavigationComponent, ScorecardSetupComponent, ScoreEntryComponent, ScoringSystemsComponent, LucidePlus, LucideShare2, LucideTrash2, LucideEye, LucideEyeOff, LucidePencil, LucidePencilOff, LucideHeart, LucideDiamond, LucideSpade, LucideClub],
})
export class App implements OnDestroy {
  private readonly handednessDialog = viewChild.required<ElementRef<HTMLDialogElement>>('handednessDialog');
  protected readonly handednessError = signal('');
  protected readonly handedness = signal(this.loadHandedness());
  private readonly gameService = inject(GameService);
  private readonly gameRepository = inject(GameRepository);
  private readonly scoringSystems = inject(ScoringSystemService);
  private readonly playerNames = inject(PlayerNameService);
  private readonly scoreTransfer = inject(ScoreTransferService);
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
  protected readonly giftDetailsVisible = signal(false);
  protected readonly tableEditMode = signal(false);
  protected readonly scoreEntryOpen = signal(false);
  protected readonly editingGift = signal<Gift | null>(null);
  protected readonly transferMode = signal<TransferMode>('share');
  protected readonly transferOpen = signal(false);
  protected readonly importPreview = signal<ImportPreview | null>(null);
  protected readonly qrImage = signal('');
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

  private scanner: import('html5-qrcode').Html5Qrcode | null = null;

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
      if (isNewGift && Math.random() < 0.5) {
        void import('@materializecss/materialize').then(({ Toast }) => {
          new Toast({
            text: GIFT_TOASTS[Math.floor(Math.random() * GIFT_TOASTS.length)],
            displayLength: 6000,
            outDuration: 600,
            classes: 'rounded red lighten-2 black-text opacity-75',
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
    this.settingsOpen.set(true);
  }

  protected scoringSystemLabel(game: GameV2): string {
    return game.rulesSnapshot?.name ?? 'Historische kaart';
  }

  protected manualGiftCount(game: GameV2): number {
    return game.gifts.filter((gift) => gift.entryMode !== 'automatic').length;
  }

  protected previewProgress(game: GameV2): string {
    if (!this.isPlayable(game)) return `${game.gifts.length} gifts · alleen geschiedenis`;
    return `${game.gifts.length} / ${this.gameService.getGiftLimit(game)} gifts`;
  }

  protected previewNextDealer(game: GameV2): string {
    const dealerId = this.gameService.getNextGiftDealerId(game);
    return game.players.find((player) => player.id === dealerId)?.name ?? 'Klaar';
  }

  protected previewTotals(game: GameV2): Record<string, number> {
    return this.gameService.getTotals(game);
  }

  protected async openTransfer(mode: TransferMode): Promise<void> {
    this.transferMode.set(mode);
    this.transferOpen.set(true);
    this.message.set('');
    this.qrImage.set('');
    if (mode === 'share') {
      const game = this.game();
      if (!game) return;
      try {
        this.qrImage.set(await this.scoreTransfer.createQrImage(game));
      } catch {
        this.message.set('Deze scorekaart past niet in een QR-code. Download een back-upbestand.');
      }
    }
  }

  protected async startScanner(): Promise<void> {
    this.message.set('Richt de camera op de QR-code van een scorekaart.');
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      this.scanner = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => void this.importSnapshot(text),
        () => undefined,
      );
    } catch {
      this.message.set('Camera niet beschikbaar. Importeer een back-upbestand.');
    }
  }

  protected async closeTransfer(): Promise<void> {
    if (this.scanner?.isScanning) await this.scanner.stop().catch(() => undefined);
    this.scanner?.clear();
    this.scanner = null;
    this.transferOpen.set(false);
  }

  protected exportJson(): void {
    const game = this.game();
    if (!game) return;
    const blob = new Blob([this.scoreTransfer.serialize(game)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.fileSafeName(game.name)}-scorekaart.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected async importJson(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      this.importSnapshot(await file.text());
    } catch {
      this.message.set('Bestand kan niet worden gelezen.');
    } finally {
      input.value = '';
    }
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

  ngOnDestroy(): void {
    void this.closeTransfer();
  }

  protected cancelImport(): void {
    this.importPreview.set(null);
  }

  protected confirmImport(asCopy = false): void {
    const preview = this.importPreview();
    if (!preview || (preview.collision && !asCopy)) return;
    const game = asCopy ? this.scoreTransfer.copyWithNewIds(preview.game) : preview.game;
    this.importPreview.set(null);
    this.setupOpen.set(false);
    this.message.set('Scorekaart geïmporteerd.');
    this.saveGame(game);
    void this.closeTransfer();
  }

  private importSnapshot(raw: string): boolean {
    try {
      const parsed = this.scoreTransfer.parse(raw);
      const importedGame = 'gifts' in parsed ? parsed : this.gameRepository.convertLegacyGame(parsed);
      const collision = this.repositoryState().games.some((game) => game.id === importedGame.id);
      this.importPreview.set({ game: importedGame, collision });
      this.message.set('');
      void this.closeTransfer();
      return true;
    } catch {
      this.message.set('Deze back-up is ongeldig of wordt niet ondersteund.');
      return false;
    }
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

  private fileSafeName(name: string): string {
    return name.normalize('NFKD').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'rikken';
  }
}
