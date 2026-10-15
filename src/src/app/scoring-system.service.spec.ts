import { TestBed } from '@angular/core/testing';
import { ScoringSystemService } from './services/scoring-system.service';

describe('ScoringSystemService', () => {
  let service: ScoringSystemService;
  const storageKey = 'rikken-scoring-systems-v1';

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScoringSystemService);
  });

  afterEach(() => localStorage.removeItem(storageKey));

  it('starts with a confirmed source preset and creates a custom system', () => {
    const [preset] = service.getSystems();
    const values = structuredClone(preset.values);
    const changedValues = { ...values, rikAfrik: [8, ...values.rikAfrik.slice(1)] };

    const created = service.createSystem('Avondvariant', changedValues);

    expect(preset.kind).toBe('source-preset');
    expect(preset.verification).toBe('confirmed');
    expect(created.kind).toBe('custom');
    expect(created.verification).toBe('confirmed');
    expect(service.getSystems().map((system) => system.name)).toContain('Avondvariant');
  });

  it('confirms the default preset when loading older saved systems', () => {
    const [preset] = service.getSystems();
    localStorage.setItem(storageKey, JSON.stringify([{ ...preset, verification: 'unverified' }]));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScoringSystemService);

    expect(service.getSystems()[0].verification).toBe('confirmed');
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '[]')[0].verification).toBe('confirmed');
  });

  it('rejects blank and case-insensitive duplicate names', () => {
    expect(() => service.createSystem('   ', service.getSystems()[0].values)).toThrow(/naam/i);
    expect(() => service.createSystem(' LANDelijke GILDE BEERSE ', service.getSystems()[0].values)).toThrow(/naam/i);
  });

  it('rejects fractional and non-conserving configured values', () => {
    const values = structuredClone(service.getSystems()[0].values);
    const fractional = { ...values, soloContracts: { ...values.soloContracts, abondance: 12.5 } };
    expect(() => service.createSystem('Fractioneel', fractional)).toThrow(/waarde|heel|getal|punt/i);

    const nonConserving = { ...values, soloContracts: { ...values.soloContracts, abondance: 13 } };
    expect(() => service.createSystem('Niet gebalanceerd', nonConserving)).toThrow(/deelbaar|balans|conserv/i);

    const invalidRikAfrik = { ...values, rikAfrik: [7.5, ...values.rikAfrik.slice(1)] };
    expect(() => service.createSystem('Gebroken reeks', invalidRikAfrik)).toThrow(/waarde|heel|getal|punt/i);
  });

  it('requires confirmed removal and never removes the final system', () => {
    const custom = service.createSystem('Tijdelijk', service.getSystems()[0].values);

    expect(() => service.removeSystem(custom.id, false)).toThrow(/bevestig/i);
    service.removeSystem(custom.id, true);
    expect(service.getSystems()).toHaveLength(1);
    expect(() => service.removeSystem(service.getSystems()[0].id, true)).toThrow(/laatste|minstens één|beschikbaar/i);
  });

  it('keeps confirmation after edits while existing game snapshots remain unchanged', () => {
    const preset = service.getSystems()[0];
    const existingSnapshot = service.createSnapshot(preset.id);

    service.confirmSourcePreset(preset.id);
    const confirmed = service.getSystems()[0];
    const editedValues = {
      ...confirmed.values,
      rikAfrik: [8, ...confirmed.values.rikAfrik.slice(1)],
    };
    const edited = service.updateSystem(confirmed.id, { name: confirmed.name, values: editedValues });
    const newSnapshot = service.createSnapshot(edited.id);

    expect(edited.verification).toBe('confirmed');
    expect(edited.revision).toBe(confirmed.revision + 1);
    expect(existingSnapshot.verification).toBe('confirmed');
    expect(existingSnapshot.values.rikAfrik[0]).toBe(preset.values.rikAfrik[0]);
    expect(newSnapshot.verification).toBe('confirmed');
    expect(newSnapshot.values.rikAfrik[0]).toBe(8);
  });
});