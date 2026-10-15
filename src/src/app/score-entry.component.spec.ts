import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ScoreEntryComponent } from './score-entry.component';
import { GameV2, Player } from './models/game';
import { RulesSnapshot } from './models/scoring-system';
import { ScoringSystemService } from './services/scoring-system.service';

const players: Player[] = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => ({ id, name: id }));

describe('ScoreEntryComponent', () => {
  let snapshot: RulesSnapshot;

  beforeEach(() => {
    localStorage.removeItem('rikken-scoring-systems-v1');
    TestBed.configureTestingModule({ imports: [ScoreEntryComponent] });
    const systems = TestBed.inject(ScoringSystemService);
    const custom = systems.createSystem('Testregels', systems.getSystems()[0].values);
    snapshot = systems.createSnapshot(custom.id);
  });

  afterEach(() => localStorage.removeItem('rikken-scoring-systems-v1'));

  it('defaults tricks to eight and previews configured changes per player', async () => {
    const fixture = await createEntry(snapshot, 4);
    const compiled = fixture.nativeElement as HTMLElement;
    const tricksSlider = compiled.querySelector<HTMLInputElement>('[aria-label="Slagen rikkers"]')!;
    const opponentSlider = compiled.querySelector<HTMLInputElement>('[aria-label="Slagen tegenstanders"]')!;
    expect(compiled.querySelector('fieldset legend')?.textContent).toBe('Kies spelers');
    expect(compiled.querySelectorAll('fieldset legend')[1]?.textContent).toBe('Aantal slagen');
    expect(tricksSlider.type).toBe('range');
    expect(tricksSlider.value).toBe('8');
    expect(opponentSlider.value).toBe('5');
    expect(compiled.querySelector('.score-preview h5')).toBeNull();
    expect(compiled.querySelector('.score-preview')?.getAttribute('role')).toBe('group');

    setInput(compiled, 'Slagen tegenstanders', '9');
    fixture.detectChanges();
    expect(tricksSlider.value).toBe('4');
    expect(opponentSlider.value).toBe('9');

    setSelect(compiled, 'Rikker 1', 'p1');
    setSelect(compiled, 'Rikker 2', 'p2');
    setInput(compiled, 'Slagen rikkers', '13');
    fixture.detectChanges();

    expect(opponentSlider.value).toBe('0');
    expect(compiled.querySelector('[data-player-id="p1"]')?.textContent).toContain('+7');
    expect(compiled.querySelector('[data-player-id="p3"]')?.textContent).toContain('-7');
  });

  it('prevents selecting the same player twice for paired contracts', async () => {
    const fixture = await createEntry(snapshot, 4);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector<HTMLSelectElement>('[aria-label="Rikker 1"]')?.value).toBe('');
    expect(compiled.querySelector<HTMLSelectElement>('[aria-label="Rikker 2"]')?.value).toBe('');
    expect(compiled.querySelector<HTMLSelectElement>('[aria-label="Rikker 1"] option[value="p2"]')?.disabled).toBe(false);
    setSelect(compiled, 'Rikker 1', 'p1');
    fixture.detectChanges();
    expect(compiled.querySelector<HTMLSelectElement>('[aria-label="Rikker 2"] option[value="p1"]')?.disabled).toBe(true);

    setSelect(compiled, 'Contract', 'miserie-two');
    fixture.detectChanges();
    expect(compiled.querySelector<HTMLSelectElement>('[aria-label="Miserie-speler 1"]')?.value).toBe('');
    expect(compiled.querySelector<HTMLSelectElement>('[aria-label="Miserie-speler 2"]')?.value).toBe('');
    expect(compiled.querySelector<HTMLSelectElement>('[aria-label="Miserie-speler 2"] option[value="p1"]')?.disabled).toBe(false);
    setSelect(compiled, 'Miserie-speler 1', 'p2');
    fixture.detectChanges();
    expect(compiled.querySelector<HTMLSelectElement>('[aria-label="Miserie-speler 2"] option[value="p2"]')?.disabled).toBe(true);
  });

  it('starts the soloist selector empty and uses the toilet icon for dealer sit-out', async () => {
    const fixture = await createEntry(snapshot, 5);
    const compiled = fixture.nativeElement as HTMLElement;
    setSelect(compiled, 'Contract', 'abondance');
    fixture.detectChanges();

    expect(compiled.querySelector<HTMLSelectElement>('[aria-label="Soloist"]')?.value).toBe('');
    expect(compiled.querySelector('[data-player-id="p5"] svg[lucideToilet]')).not.toBeNull();
    expect(compiled.querySelector('[data-player-id="p5"] small')).toBeNull();
  });

  it('keeps unverified automatic outcomes manual-only', async () => {
    const scoringSystems = TestBed.inject(ScoringSystemService);
    const unverified = {
      ...scoringSystems.createSnapshot(scoringSystems.getSystems()[0].id),
      verification: 'unverified' as const,
    };
    const fixture = await createEntry(unverified, 4);
    const compiled = fixture.nativeElement as HTMLElement;
    setSelect(compiled, 'Contract', 'abondance');
    fixture.detectChanges();

    expect(compiled.querySelector('[role="status"]')?.textContent).toMatch(/handmatig/i);
    expect(compiled.querySelector('[data-action="save-gift"]')).toBeNull();
    expect(compiled.querySelector('[data-action="manual-entry"]')).toBeTruthy();
  });

  it('excludes the five-player dealer and requires confirmation for imbalanced manual changes', async () => {
    const fixture = await createEntry(snapshot, 5);
    const emitted = vi.fn();
    fixture.componentInstance.saved.subscribe(emitted);
    const compiled = fixture.nativeElement as HTMLElement;
    setSelect(compiled, 'Contract', 'manual');
    fixture.detectChanges();

    const dealerRow = compiled.querySelector<HTMLElement>('[data-player-id="p5"]');
    expect(dealerRow?.querySelector('svg[lucideToilet]')).not.toBeNull();
    expect(dealerRow?.querySelector('input')?.hasAttribute('disabled')).toBe(true);

    setInput(compiled, 'Punten voor p1', '5');
    compiled.querySelector<HTMLButtonElement>('[data-action="save-gift"]')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('[role="alert"]')?.textContent).toMatch(/niet in balans|bevestig/i);
    expect(emitted).not.toHaveBeenCalled();

    compiled.querySelector<HTMLButtonElement>('[data-action="confirm-imbalance"]')?.click();
    fixture.detectChanges();
    expect(emitted).toHaveBeenCalledOnce();
  });

  it('keeps Verzaking manual-only and preserves the contract on save', async () => {
    const fixture = await createEntry(snapshot, 4);
    const emitted: { input: { contract: string } | null; entryMode: string }[] = [];
    fixture.componentInstance.saved.subscribe((gift) => emitted.push(gift));
    const compiled = fixture.nativeElement as HTMLElement;
    setSelect(compiled, 'Contract', 'verzaking');
    fixture.detectChanges();

    expect(compiled.querySelector('[data-action="save-gift"]')).toBeTruthy();
    expect(compiled.querySelector('[data-action="manual-entry"]')).toBeNull();
    setInput(compiled, 'Punten voor p1', '5');
    compiled.querySelector<HTMLButtonElement>('[data-action="save-gift"]')?.click();
    fixture.detectChanges();

    expect(emitted).toHaveLength(0);
    expect(compiled.querySelector('[role="alert"]')?.textContent).toMatch(/niet in balans|bevestig/i);
    compiled.querySelector<HTMLButtonElement>('[data-action="confirm-imbalance"]')?.click();

    expect(emitted).toHaveLength(1);
    expect(emitted[0].input).toEqual({ contract: 'verzaking', mode: 'manual-only' });
    expect(emitted[0].entryMode).toBe('manual');
  });
});

async function createEntry(snapshot: RulesSnapshot, playerCount: number) {
  const fixture = TestBed.createComponent(ScoreEntryComponent);
  const now = '2026-10-07T18:00:00.000Z';
  const game: GameV2 = {
    id: 'game',
    name: 'Test',
    players: players.slice(0, playerCount),
    rulesSnapshot: snapshot,
    gifts: [],
    legacy: false,
    createdAt: now,
    updatedAt: now,
  };
  fixture.componentRef.setInput('game', game);
  fixture.componentRef.setInput('dealerId', playerCount === 5 ? 'p5' : 'p1');
  fixture.detectChanges();
  return fixture;
}

function setSelect(compiled: HTMLElement, label: string, value: string): void {
  const select = compiled.querySelector<HTMLSelectElement>(`[aria-label="${label}"]`)!;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function setInput(compiled: HTMLElement, label: string, value: string): void {
  const input = compiled.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}