import { inject, Injectable } from '@angular/core';
import { RulesSnapshot, ScoringSystem, ScoringValues, SoloContract } from '../models/scoring-system';
import { GameRepository } from './game-repository.service';

const SOURCE_SYSTEM_NAME = 'Broederschap Abondance';
const SOLO_CONTRACTS: readonly SoloContract[] = [
  'abondance',
  'miserieOne',
  'miserieOpen',
  'thirteenTricks',
  'soloSlim',
];

function copyValues(values: ScoringValues): ScoringValues {
  return {
    rikAfrik: [...values.rikAfrik],
    soloContracts: { ...values.soloContracts },
    twoPlayerMiserie: values.twoPlayerMiserie,
    verzaking: values.verzaking ? { ...values.verzaking } : null,
  };
}

function sourceValues(): ScoringValues {
  return {
    rikAfrik: [7, 6, 5, 4, 3, 2, -3, -4, -5, -6, -7, -8, -9, -10],
    soloContracts: {
      abondance: 12,
      miserieOne: 15,
      miserieOpen: 30,
      thirteenTricks: 30,
      soloSlim: 48,
    },
    twoPlayerMiserie: 10,
    verzaking: { mode: 'manual-only' },
  };
}

@Injectable({ providedIn: 'root' })
export class ScoringSystemService {
  private readonly repository = inject(GameRepository);
  private systems = this.loadInitialSystems();

  getSystems(): ScoringSystem[] {
    return this.systems.map((system) => ({ ...system, values: copyValues(system.values) }));
  }

  createSystem(name: string, values: ScoringValues): ScoringSystem {
    const normalizedName = this.validateName(name);
    this.validateValues(values);
    const system: ScoringSystem = {
      id: crypto.randomUUID(),
      name: normalizedName,
      revision: 1,
      kind: 'custom',
      verification: 'confirmed',
      values: copyValues(values),
    };
    this.systems = [...this.systems, system];
    this.persist();
    return { ...system, values: copyValues(system.values) };
  }

  updateSystem(id: string, update: Pick<ScoringSystem, 'name' | 'values'>): ScoringSystem {
    const current = this.findSystem(id);
    const name = this.validateName(update.name, id);
    this.validateValues(update.values);
    const valuesChanged = JSON.stringify(current.values) !== JSON.stringify(update.values);
    const updated: ScoringSystem = {
      ...current,
      name,
      revision: current.revision + Number(valuesChanged),
      values: copyValues(update.values),
    };
    this.systems = this.systems.map((system) => system.id === id ? updated : system);
    this.persist();
    return { ...updated, values: copyValues(updated.values) };
  }

  confirmSourcePreset(id: string): ScoringSystem {
    const current = this.findSystem(id);
    if (current.kind !== 'source-preset') throw new Error('Alleen het bronregelsysteem kan worden bevestigd.');
    const confirmed = { ...current, verification: 'confirmed' as const };
    this.systems = this.systems.map((system) => system.id === id ? confirmed : system);
    this.persist();
    return { ...confirmed, values: copyValues(confirmed.values) };
  }

  removeSystem(id: string, confirmed: boolean): void {
    if (!confirmed) throw new Error('Bevestig eerst het verwijderen van dit scoringssysteem.');
    this.findSystem(id);
    if (this.systems.length === 1) throw new Error('Minstens één scoringssysteem moet beschikbaar blijven.');
    this.systems = this.systems.filter((system) => system.id !== id);
    this.persist();
  }

  createSnapshot(id: string): RulesSnapshot {
    const system = this.findSystem(id);
    return {
      systemId: system.id,
      name: system.name,
      revision: system.revision,
      kind: system.kind,
      verification: system.verification,
      values: copyValues(system.values),
    };
  }

  private findSystem(id: string): ScoringSystem {
    const system = this.systems.find((item) => item.id === id);
    if (!system) throw new Error('Scoringssysteem niet gevonden.');
    return system;
  }

  private loadInitialSystems(): ScoringSystem[] {
    const stored = this.repository.loadScoringSystems();
    if (stored?.length) {
      const systems = stored.map((system) =>
        system.kind === 'source-preset' && system.name === SOURCE_SYSTEM_NAME
          ? { ...system, verification: 'confirmed' as const }
          : system);
      if (systems.some((system, index) => system.verification !== stored[index].verification)) {
        this.repository.saveScoringSystems(systems);
      }
      return systems;
    }
    const preset: ScoringSystem = {
      id: crypto.randomUUID(),
      name: SOURCE_SYSTEM_NAME,
      revision: 1,
      kind: 'source-preset',
      verification: 'confirmed',
      values: sourceValues(),
    };
    this.repository.saveScoringSystems([preset]);
    return [preset];
  }

  private persist(): void {
    this.repository.saveScoringSystems(this.systems);
  }

  private validateName(name: string, excludingId?: string): string {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Vul een naam in voor het scoringssysteem.');
    const normalized = trimmed.toLocaleLowerCase('nl-NL');
    if (this.systems.some((system) => system.id !== excludingId
      && system.name.toLocaleLowerCase('nl-NL') === normalized)) {
      throw new Error('Deze naam is al in gebruik. Kies een unieke naam.');
    }
    return trimmed;
  }

  private validateValues(values: ScoringValues): void {
    if (!values || !Array.isArray(values.rikAfrik) || values.rikAfrik.length !== 14
      || !values.rikAfrik.every(Number.isSafeInteger)) {
      throw new Error('Rik/Afrik moet precies 14 gehele puntwaarden bevatten.');
    }
    if (!values.soloContracts || SOLO_CONTRACTS.some((contract) => {
      const value = values.soloContracts[contract];
      return !Number.isSafeInteger(value) || value <= 0 || value % 3 !== 0;
    })) {
      throw new Error('Solo-contractwaarden moeten positieve gehele getallen zijn, deelbaar door drie.');
    }
    if (!Number.isSafeInteger(values.twoPlayerMiserie) || values.twoPlayerMiserie <= 0) {
      throw new Error('Twee-speler-Miserie moet een positief geheel getal zijn.');
    }
    if (values.verzaking !== null && values.verzaking?.mode !== 'manual-only') {
      throw new Error('Verzaking kan alleen als handmatige invoer worden ingesteld.');
    }
  }
}