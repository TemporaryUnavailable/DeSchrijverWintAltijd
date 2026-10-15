import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ScorecardSetupComponent } from './scorecard-setup.component';
import { GameV2 } from './models/game';
import { GameService } from './services/game.service';
import { PlayerNameService } from './services/player-name.service';
import { ScoringSystemService } from './services/scoring-system.service';

describe('ScorecardSetupComponent', () => {
  const scoringStorageKey = 'rikken-scoring-systems-v1';
  const namesStorageKey = 'rikken-player-names-v1';

  beforeEach(async () => {
    localStorage.removeItem(scoringStorageKey);
    localStorage.removeItem(namesStorageKey);
    await TestBed.configureTestingModule({ imports: [ScorecardSetupComponent] }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem(scoringStorageKey);
    localStorage.removeItem(namesStorageKey);
  });

  it('requires a scoring system and rejects blank or duplicate seats', () => {
    const systems = TestBed.inject(ScoringSystemService);
    systems.createSystem('Avondvariant', systems.getSystems()[0].values);
    const fixture = TestBed.createComponent(ScorecardSetupComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const selection = compiled.querySelector<HTMLSelectElement>('[aria-label="Scoringssysteem"]');
    expect(selection).toBeTruthy();
    expect(selection!.value).toBe('');

    compiled.querySelector<HTMLButtonElement>('.begin-button')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('[role="alert"]')?.textContent).toMatch(/scoringssysteem/i);

    selectSystem(compiled);
    setNames(compiled, ['Noor', 'Jules', 'Sam', '']);
    compiled.querySelector<HTMLButtonElement>('.begin-button')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('[role="alert"]')?.textContent).toMatch(/vier|naam/i);

    setNames(compiled, ['Noor', 'Sam', 'SAM', 'Mila']);
    compiled.querySelector<HTMLButtonElement>('.begin-button')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('[role="alert"]')?.textContent).toMatch(/verschill|dubbel/i);
  });

  it('selects the only scoring system by default when creating a scorecard', () => {
    const fixture = TestBed.createComponent(ScorecardSetupComponent);
    const created = vi.fn<(game: GameV2) => void>();
    fixture.componentInstance.created.subscribe(created);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const [system] = TestBed.inject(ScoringSystemService).getSystems();

    expect(compiled.querySelector<HTMLSelectElement>('[aria-label="Scoringssysteem"]')?.value).toBe(system.id);
    setNames(compiled, ['Noor', 'Jules', 'Sam', 'Mila']);
    compiled.querySelector<HTMLButtonElement>('.begin-button')?.click();

    expect(created).toHaveBeenCalledOnce();
    expect(created.mock.calls[0][0].rulesSnapshot?.systemId).toBe(system.id);
  });

  it('emits valid four- and five-player games in the selected order', () => {
    const fixture = TestBed.createComponent(ScorecardSetupComponent);
    const created = vi.fn<(game: GameV2) => void>();
    fixture.componentInstance.created.subscribe(created);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    selectSystem(compiled);
    setNames(compiled, ['Noor', 'Jules', 'Sam', 'Mila']);
    compiled.querySelector<HTMLButtonElement>('.begin-button')?.click();
    fixture.detectChanges();
    expect(created).toHaveBeenCalledOnce();
    expect(created.mock.calls[0][0].players.map((player) => player.name)).toEqual(['Noor', 'Jules', 'Sam', 'Mila']);

    compiled.querySelector<HTMLButtonElement>('[data-action="add-seat"]')?.click();
    fixture.detectChanges();
    setNames(compiled, ['Pim', 'Noor', 'Jules', 'Sam', 'Mila']);
    compiled.querySelector<HTMLButtonElement>('.begin-button')?.click();
    fixture.detectChanges();
    expect(created).toHaveBeenCalledTimes(2);
    expect(created.mock.calls[1][0].players.map((player) => player.name)).toEqual(['Pim', 'Noor', 'Jules', 'Sam', 'Mila']);
  });

  it('offers remembered names as optional suggestions without fixing the lineup', () => {
    const names = TestBed.inject(PlayerNameService);
    names.remember(['Luca', 'Mila']);
    const fixture = TestBed.createComponent(ScorecardSetupComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const suggestions = compiled.querySelector('datalist');
    expect(suggestions?.querySelector('option')?.getAttribute('value')).toBe('Luca');
    expect(compiled.querySelector<HTMLInputElement>('[aria-label="Naam speler 1"]')?.value).toBe('');
  });
});

function selectSystem(compiled: HTMLElement): void {
  const selection = compiled.querySelector<HTMLSelectElement>('[aria-label="Scoringssysteem"]')!;
  const service = TestBed.inject(ScoringSystemService);
  selection.value = service.getSystems()[0].id;
  selection.dispatchEvent(new Event('change', { bubbles: true }));
}

function setNames(compiled: HTMLElement, values: string[]): void {
  for (const [index, value] of values.entries()) {
    const input = compiled.querySelector<HTMLInputElement>(`[aria-label="Naam speler ${index + 1}"]`);
    if (!input) continue;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}