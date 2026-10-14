import { Inject, Injectable, Optional } from '@angular/core';
import { GameRepository } from './game-repository.service';

const STORAGE_KEY = 'rikken-player-names-v1';

@Injectable({ providedIn: 'root' })
export class PlayerNameService {
  constructor(@Optional() @Inject(GameRepository) private readonly repository: GameRepository | null = null) {}

  getSuggestions(): string[] {
    try {
      if (this.repository) return this.uniqueNames(this.repository.loadRememberedPlayerNames());
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as unknown;
      return Array.isArray(parsed) ? this.uniqueNames(parsed.filter((name): name is string => typeof name === 'string')) : [];
    } catch {
      return [];
    }
  }

  remember(names: readonly string[]): void {
    const suggestions = this.uniqueNames([...names, ...this.getSuggestions()]);
    if (this.repository) this.repository.saveRememberedPlayerNames(suggestions);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(suggestions));
  }

  private uniqueNames(names: readonly string[]): string[] {
    const seen = new Set<string>();
    return names
      .map((name) => name.trim())
      .filter((name) => {
        if (!name) return false;
        const normalized = name.toLocaleLowerCase('nl-NL');
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
  }
}