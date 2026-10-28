import { Component, inject, signal } from '@angular/core';
import { ScoringSystem, ScoringValues, SoloContract } from './models/scoring-system';
import { ScoringSystemService } from './services/scoring-system.service';

@Component({
  selector: 'app-scoring-systems',
  templateUrl: './scoring-systems.component.html',
  styleUrl: './scoring-systems.component.css',
})
export class ScoringSystemsComponent {
  private readonly scoringSystems = inject(ScoringSystemService);

  protected readonly systems = signal(this.scoringSystems.getSystems());
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly draftName = signal('');
  protected readonly draftValues = signal<ScoringValues>(this.systems()[0].values);
  protected readonly message = signal('');
  protected readonly soloContracts: readonly { key: SoloContract; label: string }[] = [
    { key: 'abondance', label: 'Abondance' },
    { key: 'miserieOne', label: 'Miserie' },
    { key: 'miserieOpen', label: 'Open Miserie' },
    { key: 'thirteenTricks', label: '13 slagen' },
    { key: 'soloSlim', label: 'Solo slim' },
  ];

  protected startCreate(): void {
    this.editingId.set(null);
    this.draftName.set('');
    this.draftValues.set(this.copyValues(this.systems()[0].values));
    this.message.set('');
    this.editorOpen.set(true);
  }

  protected startEdit(system: ScoringSystem): void {
    this.editingId.set(system.id);
    this.draftName.set(system.name);
    this.draftValues.set(this.copyValues(system.values));
    this.message.set('');
    this.editorOpen.set(true);
  }

  protected updateName(value: string): void {
    this.draftName.set(value);
  }

  protected updateRikAfrik(index: number, rawValue: string): void {
    const value = rawValue === '' ? Number.NaN : Number(rawValue);
    this.draftValues.update((current) => ({
      ...current,
      rikAfrik: current.rikAfrik.map((item, itemIndex) => itemIndex === index ? value : item),
    }));
  }

  protected updateSoloContract(key: SoloContract, rawValue: string): void {
    const value = rawValue === '' ? Number.NaN : Number(rawValue);
    this.draftValues.update((current) => ({
      ...current,
      soloContracts: { ...current.soloContracts, [key]: value },
    }));
  }

  protected updateTwoPlayerMiserie(rawValue: string): void {
    this.draftValues.update((current) => ({
      ...current,
      twoPlayerMiserie: rawValue === '' ? Number.NaN : Number(rawValue),
    }));
  }

  protected saveSystem(event: Event): void {
    event.preventDefault();
    try {
      const id = this.editingId();
      if (id) this.scoringSystems.updateSystem(id, { name: this.draftName(), values: this.draftValues() });
      else this.scoringSystems.createSystem(this.draftName(), this.draftValues());
      this.refresh();
      this.editorOpen.set(false);
      this.message.set('');
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Scoringssysteem kan niet worden opgeslagen.');
    }
  }

  protected cancelEdit(): void {
    this.editorOpen.set(false);
    this.message.set('');
  }

  protected confirmSource(system: ScoringSystem): void {
    try {
      this.scoringSystems.confirmSourcePreset(system.id);
      this.refresh();
      this.message.set('');
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Bronregels kunnen niet worden bevestigd.');
    }
  }

  protected removeSystem(system: ScoringSystem): void {
    if (!window.confirm(`Scoringssysteem "${system.name}" verwijderen? Bestaande scorekaarten behouden hun opgeslagen regels.`)) return;
    try {
      this.scoringSystems.removeSystem(system.id, true);
      this.refresh();
      this.message.set('');
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Scoringssysteem kan niet worden verwijderd.');
    }
  }

  private refresh(): void {
    this.systems.set(this.scoringSystems.getSystems());
  }

  private copyValues(values: ScoringValues): ScoringValues {
    return {
      rikAfrik: [...values.rikAfrik],
      soloContracts: { ...values.soloContracts },
      twoPlayerMiserie: values.twoPlayerMiserie,
      verzaking: values.verzaking ? { ...values.verzaking } : null,
    };
  }
}