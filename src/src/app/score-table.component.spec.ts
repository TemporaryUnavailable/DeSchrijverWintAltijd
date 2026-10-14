import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Game, GameV2, Gift, Player } from './models/game';
import { RulesSnapshot } from './models/scoring-system';
import { ScoreTableComponent } from './score-table.component';
import { ScoringSystemService } from './services/scoring-system.service';

describe('ScoreTableComponent v2 history', () => {
  let snapshot: RulesSnapshot;
  const players: Player[] = ['p1', 'p2', 'p3', 'p4'].map((id) => ({ id, name: id }));

  beforeEach(() => {
    localStorage.removeItem('rikken-scoring-systems-v1');
    TestBed.configureTestingModule({ imports: [ScoreTableComponent] });
    const systems = TestBed.inject(ScoringSystemService);
    snapshot = systems.createSnapshot(systems.createSystem('Tafelregels', systems.getSystems()[0].values).id);
  });

  afterEach(() => localStorage.removeItem('rikken-scoring-systems-v1'));

  it('identifies manual corrections and emits edit actions with the stable gift ID', () => {
    const gift = makeGift('manual-gift', players[0].id, { contract: 'manual' }, 'manual', players);
    const fixture = createTable([gift], snapshot, players);
    fixture.componentRef.setInput('showGiftLabels', true);
    fixture.componentRef.setInput('showEditControls', true);
    fixture.detectChanges();
    const emitted: string[] = [];
    fixture.componentInstance.editGift.subscribe((giftId: string) => emitted.push(giftId));
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-edit-gift="manual-gift"] svg[lucidePen]')).not.toBeNull();
    expect(compiled.querySelector('[data-entry-mode="manual"]')?.textContent).toMatch(/handmatig/i);
    compiled.querySelector<HTMLButtonElement>('[data-edit-gift="manual-gift"]')?.click();

    expect(emitted).toEqual(['manual-gift']);
  });

  it('shows each player gift gain or loss alongside their running score', () => {
    const gift = makeGift('balanced-gift', players[0].id, { contract: 'manual' }, 'manual', players);
    gift.scoreChanges[players[0].id] = 14;
    gift.scoreChanges[players[1].id] = -14;
    const fixture = createTable([gift], snapshot, players);
    fixture.componentRef.setInput('showScoreChanges', true);
    fixture.detectChanges();
    const cells = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLTableCellElement>(
      '[data-entry-mode="manual"] td',
    );

    expect(cells[0].querySelector('.score-value')?.textContent?.trim()).toBe('114');
    expect(cells[0].querySelector('.score-change')?.textContent?.trim()).toBe('+14');
    expect(cells[0].querySelector('.score-change')?.classList.contains('score-gain')).toBe(true);
    expect(cells[0].getAttribute('aria-label')).toContain('gewonnen 14 punten');
    expect(cells[1].querySelector('.score-value')?.textContent?.trim()).toBe('86');
    expect(cells[1].querySelector('.score-change')?.textContent?.trim()).toBe('-14');
    expect(cells[1].querySelector('.score-change')?.classList.contains('score-loss')).toBe(true);
    expect(cells[1].getAttribute('aria-label')).toContain('verloren 14 punten');
    expect(cells[2].querySelector('.score-change')).toBeNull();
  });

  it('keeps migrated legacy history display-only', () => {
    const gift = makeGift('legacy-gift', players[0].id, null, 'legacy-manual', players);
    const fixture = createTable([gift], snapshot, players);
    const legacyGame: GameV2 = { ...fixture.componentInstance.v2Game(), legacy: true, rulesSnapshot: null };
    fixture.componentRef.setInput('game', legacyGame);
    fixture.componentRef.setInput('showGiftLabels', true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.edit-gift')).toBeNull();
    expect(compiled.querySelector('[data-delete-gift]')).toBeNull();
    expect(compiled.querySelector('.undo-gift')).toBeNull();
    expect(compiled.textContent).toContain('Oude score');
  });

  it('hides legacy round-removal icons until edit mode is enabled', () => {
    const now = '2026-10-07T18:00:00.000Z';
    const game: Game = {
      id: 'legacy-game',
      name: 'Legacy',
      players,
      rounds: [{ id: 'legacy-round', dealerId: players[0].id, scores: Object.fromEntries(players.map((player) => [player.id, 0])) }],
      createdAt: now,
      updatedAt: now,
    };
    const fixture = TestBed.createComponent(ScoreTableComponent);
    fixture.componentRef.setInput('game', game);
    fixture.componentRef.setInput('totals', Object.fromEntries(players.map((player) => [player.id, 100])));
    fixture.componentRef.setInput('leaders', []);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.remove-round')).toBeNull();

    fixture.componentRef.setInput('showEditControls', true);
    fixture.detectChanges();
    expect(compiled.querySelector('.remove-round svg[lucideX]')).not.toBeNull();
  });

  it('requires confirmation before deleting a gift and then emits its ID', () => {
    const gift = makeGift('delete-gift', players[0].id, { contract: 'manual' }, 'manual', players);
    const fixture = createTable([gift], snapshot, players);
    fixture.componentRef.setInput('showEditControls', true);
    fixture.detectChanges();
    const emitted: string[] = [];
    fixture.componentInstance.removeGift.subscribe((giftId: string) => emitted.push(giftId));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-delete-gift="delete-gift"] svg[lucideX]')).not.toBeNull();
    compiled.querySelector<HTMLButtonElement>('[data-delete-gift="delete-gift"]')?.click();
    expect(confirm).toHaveBeenCalledOnce();
    expect(emitted).toEqual([]);

    confirm.mockReturnValue(true);
    compiled.querySelector<HTMLButtonElement>('[data-delete-gift="delete-gift"]')?.click();
    expect(emitted).toEqual(['delete-gift']);
  });

  it('only shows a delete action for the latest gift in edit mode', () => {
    const gifts = [
      makeGift('older-gift', players[0].id, { contract: 'manual' }, 'manual', players),
      makeGift('latest-gift', players[1].id, { contract: 'manual' }, 'manual', players),
    ];
    const fixture = createTable(gifts, snapshot, players);
    fixture.componentRef.setInput('showEditControls', true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-edit-gift="older-gift"]')).not.toBeNull();
    expect(compiled.querySelector('[data-delete-gift="older-gift"]')).toBeNull();
    expect(compiled.querySelector('[data-delete-gift="latest-gift"]')).not.toBeNull();
  });

  it('shows final standings when the gift limit is reached', () => {
    const gifts = Array.from({ length: 12 }, (_, index) => makeGift(`gift-${index}`, players[index % 4].id, { contract: 'manual' }, 'manual', players));
    const fixture = createTable(gifts, snapshot, players);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.final-standings')?.textContent).toContain('Eindstand');
    expect(compiled.querySelectorAll('.standing-row')).toHaveLength(4);
  });

  it('labels five-player score columns and dealer sit-out cells in Dutch', () => {
    const fivePlayers = [...players, { id: 'p5', name: 'p5' }];
    const gift = makeGift('five-player-gift', fivePlayers[0].id, { contract: 'manual' }, 'manual', fivePlayers);
    const fixture = createTable([gift], snapshot, fivePlayers);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[aria-label="Giften en scores"]')).not.toBeNull();
    expect(compiled.querySelectorAll('thead .player-heading')).toHaveLength(5);
    const sitOutCell = compiled.querySelector('td.dealer-sit-out');
    expect(sitOutCell?.getAttribute('aria-label')).toBe('Dealer p1, zit uit, score 100');
    expect(sitOutCell?.querySelector('svg[lucideToilet]')).not.toBeNull();
    expect(sitOutCell?.textContent).not.toContain('Zit uit');
  });

  it('uses Materialize striped, highlight, and centered table styles', () => {
    const fixture = createTable([], snapshot, players);
    const table = (fixture.nativeElement as HTMLElement).querySelector('table.score-table');

    expect(table?.classList.contains('striped')).toBe(true);
    expect(table?.classList.contains('highlight')).toBe(true);
    expect(table?.classList.contains('centered')).toBe(true);
  });

  it('renders the gift-label column only when requested', () => {
    const gift = makeGift('swipe-gift', players[0].id, { contract: 'abondance', soloistId: players[0].id, success: true }, 'automatic', players);
    const fixture = createTable([gift], snapshot, players);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.gift-label-column')).toBeNull();

    fixture.componentRef.setInput('showGiftLabels', true);
    fixture.detectChanges();
    expect(compiled.querySelector('[data-entry-mode="automatic"] .gift-label-column')?.textContent).toBe('abondance');

    fixture.componentRef.setInput('showGiftLabels', false);
    fixture.detectChanges();
    expect(compiled.querySelector('.gift-label-column')).toBeNull();
  });
});

function createTable(gifts: Gift[], snapshot: RulesSnapshot, players: Player[]) {
  const fixture = TestBed.createComponent(ScoreTableComponent);
  const now = '2026-10-07T18:00:00.000Z';
  const game: GameV2 = {
    id: 'game',
    name: 'Test',
    players,
    rulesSnapshot: snapshot,
    gifts,
    legacy: false,
    createdAt: now,
    updatedAt: now,
  };
  const totals = Object.fromEntries(players.map((player) => [player.id, 100]));
  fixture.componentRef.setInput('game', game);
  fixture.componentRef.setInput('totals', totals);
  fixture.componentRef.setInput('leaders', []);
  fixture.detectChanges();
  return fixture;
}

function makeGift(id: string, dealerId: string, input: Gift['input'], entryMode: Gift['entryMode'], players: Player[]): Gift {
  return { id, dealerId, input, scoreChanges: Object.fromEntries(players.map((player) => [player.id, 0])), entryMode };
}