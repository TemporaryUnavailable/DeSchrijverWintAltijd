import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';
import { GameService } from './services/game.service';
import { ScoringSystemService } from './services/scoring-system.service';
import { PersistedStateV2 } from './models/persisted-state';
import { GameV2, Gift } from './models/game';
import { ScoreTransferService } from './services/score-transfer.service';
import { GameRepository } from './services/game-repository.service';
import { Toast } from '@materializecss/materialize';

describe('App', () => {
  const storageKey = 'rikken-scorekeeper-v1';
  const archiveKey = 'rikken-scorecards-v1';
  const stateKey = 'rikken-scorekeeper-v2';
  const handednessKey = 'rikken-handedness';

  beforeEach(async () => {
    // jsdom has no modal dialog methods; browser tests cover native focus and dismissal.
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, value() { this.open = true; } },
      close: { configurable: true, value() { this.open = false; } },
    });
    localStorage.removeItem(storageKey);
    localStorage.removeItem(archiveKey);
    localStorage.removeItem(stateKey);
    localStorage.removeItem(handednessKey);
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    localStorage.removeItem(storageKey);
    localStorage.removeItem(archiveKey);
    localStorage.removeItem(stateKey);
    localStorage.removeItem(handednessKey);
  });

  for (const [value, label] of [['right', 'Rechtshandig'], ['left', 'Linkshandig']] as const) {
    it(`saves and restores ${value}-handed layout`, () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const dialog = element.querySelector('dialog')!;
      expect(dialog.open).toBe(true);
      const button = Array.from(dialog.querySelectorAll('button')).find((item) => item.textContent === label)!;
      button.click();
      fixture.detectChanges();
      expect(localStorage.getItem(handednessKey)).toBe(value);
      expect(dialog.open).toBe(false);
      expect(element.querySelector('.app-shell')?.classList.contains('left-handed')).toBe(value === 'left');

      fixture.destroy();
      const reloaded = TestBed.createComponent(App);
      reloaded.detectChanges();
      expect(reloaded.nativeElement.querySelector('dialog').open).toBe(false);
      expect(reloaded.nativeElement.querySelector('.app-shell').classList.contains('left-handed')).toBe(value === 'left');
    });
  }

  it('asks again for an invalid stored preference and reports write failures without dismissing the choice', () => {
    localStorage.setItem(handednessKey, 'invalid');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('ongeldig');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    element.querySelector<HTMLButtonElement>('dialog button')!.click();
    fixture.detectChanges();
    expect(element.querySelector('dialog')!.open).toBe(true);
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('niet worden opgeslagen');
    expect(localStorage.getItem(handednessKey)).toBe('invalid');
  });

  it('reports unavailable storage when loading handedness', () => {
    const getItem = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      if (key === handednessKey) throw new Error('Storage unavailable');
      return getItem.call(this, key);
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(true);
    expect(fixture.nativeElement.querySelector('dialog [role="alert"]').textContent).toContain('niet worden gelezen');
  });

  it('starts at the archive and opens setup with four default player slots', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Scorekaarten');
    expect(compiled.querySelector('.archive-empty')?.textContent).toContain('Nog geen scorekaarten');

    compiled.querySelector<HTMLButtonElement>('.archive-new-button')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('h1')?.textContent?.replace(/\s+/g, ' ')).toContain('Nieuwe scorekaart');
    expect(compiled.querySelectorAll('[aria-label^="Naam speler"]')).toHaveLength(4);

    const addPlayer = compiled.querySelector<HTMLButtonElement>('.add-draft');
    addPlayer?.click();
    fixture.detectChanges();

    expect(compiled.querySelectorAll('[aria-label^="Naam speler"]')).toHaveLength(5);
    expect(compiled.querySelector('.add-draft')).toBeNull();
  });

  it('keeps older archived cards with more than five players readable', () => {
    const createdAt = '2026-10-02T18:00:00.000Z';
    localStorage.setItem(archiveKey, JSON.stringify({
      version: 1,
      games: [{
        id: 'legacy-seven-player-card',
        name: 'Oude kaart',
        players: ['Noor', 'Jules', 'Sam', 'Mila', 'Pim', 'Luca'].map((name, index) => ({ id: `p${index}`, name })),
        rounds: [],
        createdAt,
        updatedAt: createdAt,
      }],
    }));

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Oude kaart');
  });

  it('lists saved scorecards newest first with their participants and opens the selected card', () => {
    const players = ['Noor', 'Jules', 'Sam', 'Mila'].map((name, index) => ({ id: `p${index}`, name }));
    const makeGame = (id: string, name: string, createdAt: string) => ({
      id,
      name,
      players,
      rounds: [],
      createdAt,
      updatedAt: createdAt,
    });
    localStorage.setItem(archiveKey, JSON.stringify({
      version: 1,
      games: [
        makeGame('older', 'Vrijdagavond', '2026-10-03T18:30:00.000Z'),
        makeGame('newer', 'Zaterdag bij Jan', '2026-10-04T19:00:00.000Z'),
      ],
    }));

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const entries = compiled.querySelectorAll<HTMLButtonElement>('.archive-entry');

    expect(entries).toHaveLength(2);
    expect(entries[0].textContent).toContain('Zaterdag bij Jan');
    expect(entries[0].textContent).toContain('Noor · Jules · Sam · Mila');
    expect(entries[0].textContent).toContain('Historische kaart');
    expect(entries[0].textContent).toContain('handmatige gifts');
    expect(entries[1].textContent).toContain('Vrijdagavond');

    entries[0].click();
    fixture.detectChanges();
    expect(compiled.querySelector('#game-title')?.textContent).toContain('Zaterdag bij Jan');
  });

  it('migrates and resumes the previously active legacy scorecard on startup', () => {
    const createdAt = '2026-10-02T18:00:00.000Z';
    localStorage.setItem(storageKey, JSON.stringify({
      version: 1,
      game: {
        id: 'legacy-card',
        name: 'Oude kaart',
        players: ['Noor', 'Jules', 'Sam', 'Mila'].map((name, index) => ({ id: `p${index}`, name })),
        rounds: [],
        createdAt,
        updatedAt: createdAt,
      },
    }));

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#game-title')?.textContent).toContain('Oude kaart');
    const state = JSON.parse(localStorage.getItem(stateKey) ?? '{}') as PersistedStateV2;
    expect(state.activeGameId).toBe('legacy-card');
    expect(state.games[0].legacy).toBe(true);
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it('deletes only the active scorecard without exporting JSON', () => {
    const players = ['Noor', 'Jules', 'Sam', 'Mila'].map((name, index) => ({ id: `p${index}`, name }));
    const makeGame = (id: string, name: string, createdAt: string) => ({
      id,
      name,
      players,
      rounds: [],
      createdAt,
      updatedAt: createdAt,
    });
    const current = makeGame('current', 'Huidige kaart', '2026-10-04T19:00:00.000Z');
    const previous = makeGame('previous', 'Eerdere kaart', '2026-10-03T19:00:00.000Z');
    localStorage.setItem(archiveKey, JSON.stringify({ version: 1, games: [current, previous] }));
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, game: current }));

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.archive-entry')?.click();
    fixture.detectChanges();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const downloadSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    compiled.querySelector<HTMLButtonElement>('[data-action="delete-scorecard"]')?.click();
    fixture.detectChanges();

    const remainingGames = (JSON.parse(localStorage.getItem(stateKey) ?? '{}') as PersistedStateV2).games;
    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(downloadSpy).not.toHaveBeenCalled();
    expect(remainingGames.map((game: { id: string }) => game.id)).toEqual(['previous']);
    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(compiled.querySelector('.archive-entry')?.textContent).toContain('Eerdere kaart');
  });

  it('creates a v2 scorecard and saves balanced manual gift changes from 100', () => {
    const fixture = TestBed.createComponent(App);
    const compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    compiled.querySelector<HTMLButtonElement>('.archive-new-button')?.click();
    fixture.detectChanges();

    const playerInputs = compiled.querySelectorAll<HTMLInputElement>('[aria-label^="Naam speler"]');
    ['Noor', 'Jules', 'Sam', 'Mila'].forEach((name, index) => {
      playerInputs[index].value = name;
      playerInputs[index].dispatchEvent(new Event('input', { bubbles: true }));
    });
    fixture.detectChanges();
    const systemSelect = compiled.querySelector<HTMLSelectElement>('#scoring-system')!;
    systemSelect.value = systemSelect.options[1].value;
    systemSelect.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    compiled.querySelector<HTMLButtonElement>('.begin-button')?.click();
    fixture.detectChanges();
    compiled.querySelector<HTMLButtonElement>('.scorecard-footer .home-fab')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('[role="dialog"] #round-title')?.textContent).toContain('Score invoeren');
    compiled.querySelector<HTMLButtonElement>('[data-action="manual-entry"]')?.click();
    fixture.detectChanges();
    const scores = compiled.querySelectorAll<HTMLInputElement>('.manual-score-row input');
    scores[0].value = '14';
    scores[0].dispatchEvent(new Event('input', { bubbles: true }));
    scores[1].value = '-14';
    scores[1].dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    compiled.querySelector<HTMLButtonElement>('[data-action="save-gift"]')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.round-index')?.textContent?.trim()).toBe('01');
    expect(compiled.querySelector('.starting-row')?.textContent).toContain('100');
    expect(compiled.querySelector('tfoot td strong')?.textContent?.trim()).toBe('114');
    const savedGame = (JSON.parse(localStorage.getItem(stateKey) ?? '{}') as PersistedStateV2).games[0];
    expect(savedGame.players).toHaveLength(4);
    expect(savedGame.players[0].name).toBe('Noor');
    expect(savedGame.gifts[0].scoreChanges[savedGame.players[0].id]).toBe(14);
  });

  it('randomly shows a Materialize toast after saving a new gift', async () => {
    const game = createV2Fixture();
    localStorage.setItem(stateKey, JSON.stringify({ ...createState([game]), activeGameId: game.id }));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance as unknown as { saveGift(gift: Gift): void };
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.9).mockReturnValueOnce(0.1).mockReturnValueOnce(0.5);

    app.saveGift(makeFixtureGift(game));
    await vi.waitFor(() => expect(document.querySelector('.toast')).toBeNull());

    app.saveGift(makeFixtureGift(game));
    await vi.waitFor(() => expect(document.querySelector('#toast-container .toast')).not.toBeNull());
    const toast = Toast.getInstance(document.querySelector<HTMLElement>('#toast-container .toast')!)!;
    expect(toast.message).toBe('Broederschap!');
    expect(toast.options.displayLength).toBe(6000);
    expect(toast.options.outDuration).toBe(600);
    toast.options.outDuration = 0;
    toast.dismiss();
    await vi.waitFor(() => expect(document.querySelector('#toast-container')).toBeNull());
  });

  it('shows a far-left menu with level-five shadow and home and QR destinations', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.topbar')?.classList.contains('z-depth-2')).toBe(true);
    expect(compiled.querySelector('.topbar')?.firstElementChild?.tagName.toLowerCase()).toBe('app-navigation');
    expect(compiled.querySelector('.topbar .nav-menu-button')).toBeTruthy();
    compiled.querySelector<HTMLButtonElement>('.nav-menu-button')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.side-navigation')).toBeTruthy();

    compiled.querySelector<HTMLButtonElement>('[data-action="nav-home"]')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.archive-layout')).toBeTruthy();
    compiled.querySelector<HTMLButtonElement>('.nav-menu-button')?.click();
    fixture.detectChanges();
    compiled.querySelector<HTMLButtonElement>('[data-action="nav-qr"]')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('#transfer-title')?.textContent).toContain('QR-code scannen');
    compiled.querySelector<HTMLButtonElement>('.modal-close')?.click();
    fixture.detectChanges();
    compiled.querySelector<HTMLButtonElement>('.nav-menu-button')?.click();
    fixture.detectChanges();
    compiled.querySelector<HTMLButtonElement>('[data-action="nav-settings"]')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('app-scoring-systems')).toBeTruthy();
    expect(compiled.querySelector('#addNewScorecardButton')).toBeNull();
  });

  it('keeps the home plus action fixed and accessible', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const fab = compiled.querySelector<HTMLButtonElement>('.home-fab');

    expect(fab?.getAttribute('aria-label')).toBe('Nieuwe scorekaart maken');
    fab?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.setup-layout')).toBeTruthy();
  });

  it('places the add-gift FAB in the scorecard footer', () => {
    const game = createV2Fixture();
    localStorage.setItem(stateKey, JSON.stringify({ ...createState([game]), activeGameId: game.id }));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const fab = compiled.querySelector<HTMLButtonElement>('.scorecard-fab button');

    const footer = compiled.querySelector('.scorecard-footer');
    expect(footer?.tagName).toBe('FOOTER');
    expect(footer?.classList.contains('scorecard-footer')).toBe(true);
    expect(footer?.previousElementSibling?.tagName).toBe('MAIN');
    expect(fab?.getAttribute('aria-label')).toBe('Gift toevoegen');
    expect(compiled.querySelector(':scope > .home-fab')).toBeNull();
    fab?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('[aria-labelledby="round-title"]')).toBeTruthy();
    expect(compiled.querySelector('[title="Gift toevoegen"]')).toBeNull();
  });

  it('shows and hides gift details from the footer eye button', () => {
    const game = createV2Fixture();
    game.gifts.push(makeFixtureGift(game));
    localStorage.setItem(stateKey, JSON.stringify({ ...createState([game]), activeGameId: game.id }));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = compiled.querySelector<HTMLButtonElement>('.gift-label-toggle')!;

    expect(toggle.getAttribute('aria-label')).toBe('Giftdetails tonen');
    expect(toggle.querySelector('svg[lucideEye]')).not.toBeNull();
    expect(compiled.querySelector('.gift-label-column')).toBeNull();
    expect(compiled.querySelector('.score-change')).toBeNull();

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-label')).toBe('Giftdetails verbergen');
    expect(toggle.querySelector('svg[lucideEyeOff]')).not.toBeNull();
    expect(compiled.querySelector('[data-entry-mode] .gift-label-column')?.textContent).toBe('Handmatig');
    expect(compiled.querySelectorAll('.score-change')).toHaveLength(2);

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-label')).toBe('Giftdetails tonen');
    expect(compiled.querySelector('.gift-label-column')).toBeNull();
    expect(compiled.querySelector('.score-change')).toBeNull();
  });

  it('toggles table edit and remove icons from the footer pencil button', () => {
    const game = createV2Fixture();
    game.gifts.push(makeFixtureGift(game));
    localStorage.setItem(stateKey, JSON.stringify({ ...createState([game]), activeGameId: game.id }));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = compiled.querySelector<HTMLButtonElement>('.table-edit-toggle')!;

    expect(toggle.querySelector('svg[lucidePencil]')).not.toBeNull();
    expect(compiled.querySelector('.edit-gift')).toBeNull();
    expect(compiled.querySelector('[data-delete-gift]')).toBeNull();

    toggle.click();
    fixture.detectChanges();
    expect(toggle.querySelector('svg[lucidePencilOff]')).not.toBeNull();
    expect(compiled.querySelector('.edit-gift')).not.toBeNull();
    expect(compiled.querySelector('[data-delete-gift]')).not.toBeNull();

    toggle.click();
    fixture.detectChanges();
    expect(toggle.querySelector('svg[lucidePencil]')).not.toBeNull();
    expect(compiled.querySelector('.edit-gift')).toBeNull();
    expect(compiled.querySelector('[data-delete-gift]')).toBeNull();
  });

  it('deletes the current scorecard from the navbar after confirmation', () => {
    const game = createV2Fixture();
    localStorage.setItem(stateKey, JSON.stringify({ ...createState([game]), activeGameId: game.id }));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const deleteButton = compiled.querySelector<HTMLButtonElement>('[data-action="delete-scorecard"]');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    expect(deleteButton?.querySelector('svg[lucideTrash2]')).not.toBeNull();
    deleteButton?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('#game-title')).not.toBeNull();

    confirm.mockReturnValue(true);
    deleteButton?.click();
    fixture.detectChanges();

    const savedState = JSON.parse(localStorage.getItem(stateKey) ?? '{}') as PersistedStateV2;
    expect(savedState.games).toHaveLength(0);
    expect(savedState.activeGameId).toBeNull();
    expect(compiled.querySelector('.archive-layout')).not.toBeNull();
  });

  it('cancels an import preview without changing persisted games', () => {
    const game = createV2Fixture();
    const state = createState([game]);
    localStorage.setItem(stateKey, JSON.stringify(state));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance as unknown as { importSnapshot(raw: string): boolean };
    app.importSnapshot(TestBed.inject(ScoreTransferService).serialize(game));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('0 / 12 gifts');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Noor');
    expect(fixture.nativeElement.querySelector('.import-preview')).toBeTruthy();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('[data-action="cancel-import"]')?.click();
    fixture.detectChanges();

    expect(JSON.parse(localStorage.getItem(stateKey) ?? '{}')).toEqual(state);
    expect(fixture.nativeElement.querySelector('.import-preview')).toBeNull();
  });

  it('rejects an invalid import without changing persisted games', () => {
    const state = createState([createV2Fixture()]);
    localStorage.setItem(stateKey, JSON.stringify(state));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance as unknown as { importSnapshot(raw: string): boolean };

    expect(app.importSnapshot('{"version":2,"game":{"name":17},"derived":{}}')).toBe(false);
    fixture.detectChanges();

    expect(JSON.parse(localStorage.getItem(stateKey) ?? '{}')).toEqual(state);
    expect(fixture.nativeElement.textContent).toContain('Deze back-up is ongeldig of wordt niet ondersteund.');
    expect(fixture.nativeElement.querySelector('.import-preview')).toBeNull();
  });

  it('offers copy for an archive-wide ID collision and preserves the original card', () => {
    const game = createV2Fixture();
    localStorage.setItem(stateKey, JSON.stringify(createState([game])));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance as unknown as { importSnapshot(raw: string): boolean };
    app.importSnapshot(TestBed.inject(ScoreTransferService).serialize(game));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Bestaat al');
    compiled.querySelector<HTMLButtonElement>('[data-action="import-copy"]')?.click();
    fixture.detectChanges();
    const imported = JSON.parse(localStorage.getItem(stateKey) ?? '{}') as PersistedStateV2;

    expect(imported.games).toHaveLength(2);
    expect(imported.games.some((item) => item.id !== game.id)).toBe(true);
    expect(imported.games.find((item) => item.id === game.id)?.players.map((player) => player.id)).toEqual(game.players.map((player) => player.id));
  });

  it('resumes an imported midgame exactly once with derived totals', () => {
    const game = createV2Fixture();
    game.gifts.push(makeFixtureGift(game));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance as unknown as { importSnapshot(raw: string): boolean };
    app.importSnapshot(TestBed.inject(ScoreTransferService).serialize(game));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1 / 12 gifts');
    expect((fixture.nativeElement as HTMLElement).textContent?.toLocaleLowerCase('nl-NL')).toContain('volgende dealer: jules');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('101');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('99');
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('[data-action="confirm-import"]')?.click();
    fixture.detectChanges();

    const saved = JSON.parse(localStorage.getItem(stateKey) ?? '{}') as PersistedStateV2;
    expect(saved.games[0].gifts).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.summary-player strong')?.textContent?.trim()).toBe('101');

    fixture.destroy();
    const resumed = TestBed.createComponent(App);
    resumed.detectChanges();
    expect(resumed.nativeElement.querySelector('.summary-player strong')?.textContent?.trim()).toBe('101');
    expect(JSON.parse(localStorage.getItem(stateKey) ?? '{}').games[0].gifts).toHaveLength(1);
  });

  it('shows a visible warning when v2 state cannot be saved', () => {
    const repository = TestBed.inject(GameRepository);
    vi.spyOn(repository, 'saveState').mockReturnValue({ ok: false, error: 'Gegevens konden niet worden opgeslagen.' });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.archive-new-button')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Gegevens konden niet worden opgeslagen.');
  });
});

function createV2Fixture(): GameV2 {
  const systems = TestBed.inject(ScoringSystemService);
  return TestBed.inject(GameService).createScorecard(
    'Importkaart',
    ['Noor', 'Jules', 'Sam', 'Mila'],
    systems.createSnapshot(systems.getSystems()[0].id),
  );
}

function makeFixtureGift(game: GameV2): Gift {
  return {
    id: crypto.randomUUID(),
    dealerId: game.players[0].id,
    input: { contract: 'manual' },
    scoreChanges: Object.fromEntries(game.players.map((player, index) => [player.id, index === 0 ? 1 : index === 1 ? -1 : 0])),
    entryMode: 'manual',
  };
}

function createState(games: GameV2[]): PersistedStateV2 {
  return { version: 2, games, activeGameId: null, scoringSystems: TestBed.inject(ScoringSystemService).getSystems(), rememberedPlayerNames: [] };
}
