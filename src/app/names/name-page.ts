import { switchMap, tap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Component, computed, input, Signal, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Chart, ChartDataAxis, ChartDataset } from "../core/chart/chart";
import { FULL_DATA_PERIOD, GENERATIONS } from '@shared/models/year-periods';
import { religions, genders, ReligionBitmasks, GenderBitmasks } from '@shared/models/demographics';
import { NameRecords } from '@shared/models/name-records';
import { NameCounts } from '@shared/models/stats/name-counts';
import { NamePeriodStats } from '@shared/models/stats/name-period-stats';
import { NameRepository } from './data-access/name-repository';
import { PeriodStatsRepository } from '../demographics/period-stats-repository';
import { YearPeriodPipe } from '@shared/pipes/year-period-pipe';

// TODO: cleanup

const TIME_CHART_GROUPS = {
  "gender": genders
    .filter(g => g.bitmask !== GenderBitmasks.All)
    .map(g => ({
      bitmask: g.bitmask | ReligionBitmasks.All,
      text: g.text,
      color: `var(--gender-background-${g.slug})`,
    })),

  "religion": religions
    .filter(r => r.bitmask !== ReligionBitmasks.All)
    .map(r => ({
      bitmask: r.bitmask | GenderBitmasks.All,
      text: r.text,
      color: `hsl(from var(--religion-color-${r.slug}) h min(s, 40) 85%)`,
    })),

  "all": [{
    bitmask: ReligionBitmasks.All | GenderBitmasks.All,
    text: 'אוכלוסייה',
    color: undefined,
  }],
} as const;

@Component({
  selector: 'app-name-page',
  imports: [
    MatIcon, MatListModule, MatTooltipModule, MatCardModule, MatProgressSpinner,
    MatButtonToggleModule,
    DecimalPipe, PercentPipe, YearPeriodPipe,
    Chart, ChartDataAxis, ChartDataset,
  ],
  templateUrl: './name-page.html',
  styleUrl: './name-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NamePage {
  readonly name = input.required<string>();

  private readonly nameRepository = inject(NameRepository);

  private readonly $periodsStats = inject(PeriodStatsRepository).getAll();

  private readonly $isLoadingRecords = signal(true);

  protected readonly $isLoading = computed(() =>
    this.$isLoadingRecords() || this.$periodsStats.isLoading()
  );

  protected readonly $records: Signal<NameRecords> = toSignal(
    toObservable(this.name).pipe(
      tap(() => this.$isLoadingRecords.set(true)),
      switchMap(name => this.nameRepository.getByName(name)),
      tap(() => this.$isLoadingRecords.set(false)),
    ),
    { initialValue: [] }
  );

  protected readonly $stats = computed(() => {
    if (this.$isLoading()) return undefined;

    return new NameCounts().withRecords(this.$records(), this.$period());
  });

  protected readonly $period = signal(
    FULL_DATA_PERIOD // TODO: input
  );

  private readonly religionChartAxis =
    religions.filter(r => r.bitmask !== ReligionBitmasks.All);

  protected readonly religionChartAxisData =
    this.religionChartAxis.map(r => r.text);

  protected readonly $periodStats = computed(() => {
    if (this.$isLoading()) return undefined;

    const periodsStats = this.$periodsStats.value()!;
    const period = this.$period();

    return new NamePeriodStats(
      this.$stats()!,
      periodsStats.periods.find(p =>
        p.yearPeriod.start === period.start && p.yearPeriod.end === period.end
      )!,
      periodsStats.quantileLabels,
    );
  });

  protected readonly $religionChartData = computed(() => {
    const stats = this.$stats();
    const total = stats?.ofAll() ?? 0;
    return this.religionChartAxis.map(r => total === 0 ? 0 : (stats!.ofReligion(r) / total));
  });

  protected readonly $timeChartGroupBy = signal<keyof typeof TIME_CHART_GROUPS>('all');

  protected readonly $timeChartNorm = signal<'absolute' | 'relative'>('relative');

  protected readonly $timeChartGroups = computed(() => {
    return TIME_CHART_GROUPS[this.$timeChartGroupBy()];
  });

  protected readonly $timeChartAxisLabel = computed(() =>
    'דור' // TODO: adjust precision based on period
  );

  protected readonly $timeChartPeriods = computed(() => {
    return GENERATIONS;
  });

  protected readonly $timeChartAxisData = computed(() =>
    this.$timeChartPeriods().map(p => p.description)
  );

  protected readonly $timeChartPeriodNameStats = computed(() => {
    const allPeriodsStats = this.$periodsStats.value();
    if (!allPeriodsStats) return undefined;

    const records = this.$records();

    return this.$timeChartPeriods().map(period =>
      new NamePeriodStats(
        new NameCounts().withRecords(records, period),
        allPeriodsStats.periods.find(p => p.yearPeriod.slug === period.slug)!,
        allPeriodsStats.quantileLabels
      )
    )
  });

  protected readonly $timeChartData = computed(() => {
    const periodsNameStats = this.$timeChartPeriodNameStats();

    if (!periodsNameStats) return [];

    const norm = this.$timeChartNorm();

    return this.$timeChartGroups().map(group => ({
      label: group.text,
      data: periodsNameStats.map(stats => {
        const groupStats = stats.ofDemographicGroup(group.bitmask);
        return norm === 'absolute' ? groupStats.total : groupStats.fraction;
      }),
      format: norm === 'absolute' ? 'number:1.0-0' : 'percent:1.0-3',
      color: group.color,
    }));
  });

  protected readonly genders = genders;

  protected readonly religions = religions;

}
