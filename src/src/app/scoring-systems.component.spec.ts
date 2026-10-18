import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ScoringSystemService } from './services/scoring-system.service';
import { ScoringSystemsComponent } from './scoring-systems.component';

describe('ScoringSystemsComponent', () => {
  let service: ScoringSystemService;
  const storageKey = 'rikken-scoring-systems-v1';

  beforeEach(async () => {
    localStorage.removeItem(storageKey);
    await TestBed.configureTestingModule({ imports: [ScoringSystemsComponent] }).compileComponents();
    service = TestBed.inject(ScoringSystemService);
  });

  afterEach(() => localStorage.removeItem(storageKey));

  it('creates and lists a named scoring system', () => {
    const fixture = TestBed.createComponent(ScoringSystemsComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector<HTMLButtonElement>('[data-action="new-system"]')?.click();
    fixture.detectChanges();
    const name = compiled.querySelector<HTMLInputElement>('[aria-label="Naam scoringssysteem"]');
    expect(name).toBeTruthy();
    name!.value = 'Avondvariant';
    name!.dispatchEvent(new Event('input', { bubbles: true }));
    compiled.querySelector<HTMLButtonElement>('[data-action="save-system"]')?.click();
    fixture.detectChanges();

    const createdSystem = service.getSystems().find((system) => system.name === 'Avondvariant');
    const card = compiled.querySelector<HTMLElement>(`[data-system-id="${createdSystem?.id}"]`);
    expect(card?.textContent).toContain('Avondvariant');
    expect(card?.querySelector('[data-edit-system]')).toBeTruthy();
    expect(card?.querySelector('[data-delete-system]')).toBeTruthy();
    expect(compiled.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows validation feedback and confirms deletion before removing a system', () => {
    const existing = service.createSystem('Bestaand', service.getSystems()[0].values);
    const fixture = TestBed.createComponent(ScoringSystemsComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector<HTMLButtonElement>('[data-action="new-system"]')?.click();
    fixture.detectChanges();
    const name = compiled.querySelector<HTMLInputElement>('[aria-label="Naam scoringssysteem"]');
    name!.value = '  ';
    name!.dispatchEvent(new Event('input', { bubbles: true }));
    compiled.querySelector<HTMLButtonElement>('[data-action="save-system"]')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('[role="alert"]')?.textContent).toMatch(/naam/i);

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    compiled.querySelector<HTMLButtonElement>(`[data-delete-system="${existing.id}"]`)?.click();
    fixture.detectChanges();
    expect(confirm).toHaveBeenCalledOnce();
    expect(compiled.querySelector('.system-list')?.textContent).toContain('Bestaand');
  });

  it('shows the unverified source preset and requires confirmation', () => {
    const fixture = TestBed.createComponent(ScoringSystemsComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.source-verification')?.textContent).toMatch(/niet bevestigd|onbevestigd/i);
    compiled.querySelector<HTMLButtonElement>('[data-action="confirm-source"]')?.click();
    fixture.detectChanges();

    expect(service.getSystems()[0].verification).toBe('confirmed');
    expect(compiled.querySelector('.source-verification')?.textContent).toMatch(/bevestigd/i);
  });
});