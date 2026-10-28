import { Component, computed, inject, input } from '@angular/core';
import { GameV2 } from './models/game';
import { StatisticsService } from './services/statistics.service';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.css',
})
export class StatisticsComponent {
  private readonly statisticsService = inject(StatisticsService);
  readonly games = input.required<readonly GameV2[]>();
  protected readonly statistics = computed(() => this.statisticsService.summarize(this.games()));

  protected formatAverage(value: number | null): string {
    return value === null ? '—' : new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 }).format(value);
  }

  protected formatPercent(value: number): string {
    return new Intl.NumberFormat('nl-NL', { style: 'percent', maximumFractionDigits: 0 }).format(value);
  }

  protected trickBarWidth(count: number, distribution: readonly { count: number }[]): number {
    const maximum = Math.max(0, ...distribution.map((item) => item.count));
    return maximum === 0 ? 0 : count / maximum * 100;
  }
}