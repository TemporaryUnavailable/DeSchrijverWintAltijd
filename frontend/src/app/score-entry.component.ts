import { Component, computed, input, OnInit, output, signal } from '@angular/core';
import { LucideToilet } from '@lucide/angular';
import { MaterializeSelectDirective } from './materialize-select.directive';
import { Gift, GiftInput, GameV2, Player } from './models/game';
import { ScoringService } from './services/scoring.service';

type ContractKind = GiftInput['contract'];

@Component({
  selector: 'app-score-entry',
  imports: [LucideToilet, MaterializeSelectDirective],
  templateUrl: './score-entry.component.html',
  styleUrl: './score-entry.component.css',
})
export class ScoreEntryComponent implements OnInit {
  readonly game = input.required<GameV2>();
  readonly dealerId = input.required<string>();
  readonly initialGift = input<Gift | null>(null);
  readonly saved = output<Gift>();

  protected readonly contract = signal<ContractKind>('rik-afrik');
  protected readonly rikkerIds = signal<[string, string]>(['', '']);
  protected readonly soloistId = signal('');
  protected readonly miseriePlayerIds = signal<[string, string]>(['', '']);
  protected readonly successes = signal<[boolean, boolean]>([false, false]);
  protected readonly tricksTaken = signal('8');
  protected readonly opponentsTricks = computed(() => 13 - Number(this.tricksTaken()));
  protected readonly manualChanges = signal<Record<string, number>>({});
  protected readonly manualNote = signal('');
  protected readonly message = signal('');
  protected readonly imbalanceConfirmed = signal(false);
  protected readonly activePlayers = computed(() => this.game().players.filter((player) =>
    this.game().players.length !== 5 || player.id !== this.dealerId()));
  protected readonly calculation = computed(() => {
    if (this.contract() === 'manual' || this.contract() === 'verzaking') return { changes: this.manualScoreChanges(), error: '' };
    try {
      return { changes: this.scoring.calculate(this.game(), this.dealerId(), this.buildInput()), error: '' };
    } catch (error) {
      return { changes: null, error: error instanceof Error ? error.message : 'Automatische score niet beschikbaar.' };
    }
  });
  protected readonly manualBalance = computed(() => this.activePlayers().reduce(
    (total, player) => total + (this.manualChanges()[player.id] ?? 0),
    0,
  ));
  protected readonly contractOptions: readonly { value: ContractKind; label: string }[] = [
    { value: 'rik-afrik', label: 'Rik/Afrik' },
    { value: 'troel', label: 'Troel' },
    { value: 'abondance', label: 'Abondance' },
    { value: 'miserie-one', label: 'Miserie' },
    { value: 'miserie-two', label: 'Twee-speler-Miserie' },
    { value: 'miserie-open', label: 'Open Miserie' },
    { value: '13-slagen', label: '13 slagen' },
    { value: 'solo-slim', label: 'Solo slim' },
    { value: 'verzaking', label: 'Verzaking' },
    { value: 'manual', label: 'Handmatige invoer' },
  ];

  constructor(private readonly scoring: ScoringService) {}

  ngOnInit(): void {
    this.manualChanges.set(Object.fromEntries(this.game().players.map((player) => [player.id, 0])));
    const gift = this.initialGift();
    if (!gift) return;
    const input = gift.input;
    this.manualChanges.set({ ...this.manualChanges(), ...gift.scoreChanges });
    this.manualNote.set(gift.manualNote ?? '');
    if (!input || input.contract === 'manual') {
      this.contract.set('manual');
      return;
    }
    if (input.contract === 'verzaking') {
      this.contract.set('verzaking');
      return;
    }
    this.contract.set(input.contract);
    if (input.contract === 'rik-afrik' || input.contract === 'troel') {
      this.rikkerIds.set(input.rikkerIds);
      this.tricksTaken.set(String(input.tricksTakenByRikkers));
    } else if (input.contract === 'miserie-two') {
      this.miseriePlayerIds.set(input.miseriePlayerIds);
      this.successes.set(input.successes);
    } else if (input.contract === 'abondance' || input.contract === 'miserie-one'
      || input.contract === 'miserie-open' || input.contract === '13-slagen' || input.contract === 'solo-slim') {
      this.soloistId.set(input.soloistId);
      this.successes.set([input.success, false]);
    }
  }

  protected updateContract(value: ContractKind): void {
    this.contract.set(value);
    if (this.isSoloContract()) this.successes.update((outcomes) => [true, outcomes[1]]);
    this.message.set('');
    this.imbalanceConfirmed.set(false);
  }

  protected updateRikker(index: 0 | 1, value: string): void {
    this.rikkerIds.update((ids) => index === 0 ? [value, ids[1]] : [ids[0], value]);
  }

  protected updateSoloist(value: string): void {
    this.soloistId.set(value);
  }

  protected updateMiseriePlayer(index: 0 | 1, value: string): void {
    this.miseriePlayerIds.update((ids) => index === 0 ? [value, ids[1]] : [ids[0], value]);
  }

  protected updateSuccess(index: 0 | 1, value: boolean): void {
    this.successes.update((outcomes) => index === 0 ? [value, outcomes[1]] : [outcomes[0], value]);
  }

  protected updateTricks(value: string): void {
    this.tricksTaken.set(value);
  }

  protected updateOpponentTricks(value: string): void {
    this.tricksTaken.set(String(13 - Number(value)));
  }

  protected updateManualChange(playerId: string, rawValue: string): void {
    const value = rawValue === '' ? 0 : Number(rawValue);
    if (!Number.isSafeInteger(value)) return;
    this.manualChanges.update((changes) => ({ ...changes, [playerId]: value }));
    this.imbalanceConfirmed.set(false);
  }

  protected updateManualNote(value: string): void {
    this.manualNote.set(value);
  }

  protected manualEntry(): void {
    if (this.contract() !== 'verzaking') this.updateContract('manual');
  }

  protected saveGift(): void {
    if ((this.contract() === 'manual' || this.contract() === 'verzaking')
      && this.manualBalance() !== 0 && !this.imbalanceConfirmed()) {
      this.message.set('De scorewijzigingen zijn niet in balans. Bevestig om handmatig op te slaan.');
      return;
    }
    const calculation = this.calculation();
    if (!calculation.changes) {
      this.message.set(calculation.error || 'Controleer de invoer.');
      return;
    }
    const manual = this.contract() === 'manual' || this.contract() === 'verzaking';
    this.saved.emit({
      id: this.initialGift()?.id ?? crypto.randomUUID(),
      dealerId: this.dealerId(),
      input: this.contract() === 'manual' ? { contract: 'manual' } : this.buildInput(),
      scoreChanges: calculation.changes,
      entryMode: manual ? 'manual' : 'automatic',
      ...(this.manualNote().trim() ? { manualNote: this.manualNote().trim() } : {}),
    });
    this.message.set('');
  }

  protected confirmImbalance(): void {
    this.imbalanceConfirmed.set(true);
    this.message.set('');
    this.saveGift();
  }

  protected formatChange(value: number | undefined): string {
    const score = value ?? 0;
    return `${score > 0 ? '+' : ''}${score}`;
  }

  protected isSoloContract(): boolean {
    return ['abondance', 'miserie-one', 'miserie-open', '13-slagen', 'solo-slim'].includes(this.contract());
  }

  protected isAutomaticContract(): boolean {
    return this.contract() !== 'manual' && this.contract() !== 'verzaking';
  }

  private manualScoreChanges(): Record<string, number> {
    const changes = Object.fromEntries(this.game().players.map((player) => [player.id, this.manualChanges()[player.id] ?? 0]));
    if (this.game().players.length === 5) changes[this.dealerId()] = 0;
    return changes;
  }

  private buildInput(): GiftInput {
    const contract = this.contract();
    switch (contract) {
      case 'rik-afrik':
      case 'troel':
        return { contract, rikkerIds: this.rikkerIds(), tricksTakenByRikkers: Number(this.tricksTaken()) };
      case 'abondance':
      case 'miserie-one':
      case 'miserie-open':
      case '13-slagen':
      case 'solo-slim':
        return { contract, soloistId: this.soloistId(), success: this.successes()[0] };
      case 'miserie-two':
        return { contract: 'miserie-two', miseriePlayerIds: this.miseriePlayerIds(), successes: this.successes() };
      case 'verzaking':
        return { contract: 'verzaking', mode: 'manual-only' };
      case 'manual':
        return { contract: 'manual' };
    }
  }
}