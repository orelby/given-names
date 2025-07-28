import { Component, computed, inject, effect, ChangeDetectionStrategy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule, MatLabel } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { religions, genders, getDemographicDescription } from '@shared/models/demographics';
import { YearPeriodPipe } from '@shared/pipes/year-period-pipe';
import { YEAR_PERIODS, FULL_DATA_PERIOD } from '@shared/models/year-periods';
import { Chart, ChartDataAxis, ChartDataset } from "../core/chart/chart";
import { PeriodStatsRepository } from './period-stats-repository';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-demographics-page',
  standalone: true,
  imports: [
    RouterModule, FormsModule,
    MatChipsModule, MatButtonToggleModule, MatTooltipModule,
    MatLabel, MatFormFieldModule, MatInputModule, MatSelectModule,
    YearPeriodPipe, DecimalPipe,
    Chart, ChartDataset, ChartDataAxis,
  ],
  templateUrl: './demographics-page.html',
  styleUrl: './demographics-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemographicsPage {
  private readonly router = inject(Router);

  private readonly $queryParams = toSignal(inject(ActivatedRoute).queryParamMap);

  protected readonly $religion = computed(() => {
    const slug = this.$queryParams()?.get('religion');
    return religions.find(r => r.slug === slug) ?? religions[0]
  });

  protected readonly $gender = computed(() => {
    const slug = this.$queryParams()?.get('gender');
    return genders.find(g => g.slug === slug) ?? genders[0]
  });

  protected readonly $period = computed(() => {
    const slug = this.$queryParams()?.get('period');
    return YEAR_PERIODS.find(p => p.slug === slug) ?? FULL_DATA_PERIOD
  });

  protected $genderSlug = computed(() => this.$gender().slug);
  protected $religionSlug = computed(() => this.$religion().slug);
  protected $periodSlug = computed(() => this.$period().slug);

  protected $demographicTitle = computed(() =>
    getDemographicDescription(this.$religion(), this.$gender())
  );

  protected readonly $periodsStats = inject(PeriodStatsRepository).getAll();

  protected readonly $periodStats = computed(() => {
    const period = this.$period();
    const periodsStats = this.$periodsStats;

    return periodsStats.hasValue()
      ? periodsStats.value().periods.find(p =>
        p.yearPeriod.start === period.start && p.yearPeriod.end === period.end
      )
      : undefined;
  });

  protected readonly yearPeriods = YEAR_PERIODS;
  protected readonly religions = religions;
  protected readonly genders = genders;

  constructor() {
    effect(() => {
      this.router.navigate([], {
        queryParams: {
          religion: this.$religionSlug(),
          gender: this.$genderSlug(),
          period: this.$periodSlug(),
        },
        queryParamsHandling: 'replace'
      });
    });
  }

  protected onDemographicSelection(
    key: 'gender' | 'religion' | 'period',
    change: MatSelectChange
  ) {
    this.router.navigate([], {
      queryParams: { [key]: change.value },
      queryParamsHandling: 'merge'
    });
  }

  protected $groupStats = computed(() =>
    this.$periodStats()?.byReligionAndGender[this.$religion().slug][this.$gender().slug]
  );

  protected $quantileStats = computed(() => {
    const groupStats = this.$groupStats();

    if (!groupStats) return null;

    const decileEnd = 9;

    let decileThresholds = groupStats.quantileThresholds.slice(0, decileEnd);
    let topPercentilesThresholds = groupStats.quantileThresholds.slice(decileEnd);

    const deciles = decileThresholds.map((ceiling, i) => ({
      index: 1 + i,
      threshold: ceiling,
      total: groupStats.quantileTotals[i],
    }));

    deciles?.push({
      index: 10,
      threshold: topPercentilesThresholds[decileEnd],
      total: groupStats.quantileTotals.slice(decileEnd)
        .reduce((acc, cur) => acc + cur, 0),
    });

    const topPercentiles = topPercentilesThresholds.map((threshold, i) => ({
      index: `${91 + i}%`,
      threshold,
      total: groupStats.quantileTotals[i + decileEnd],
    }));

    return {
      deciles,
      topPercentiles
    };
  });

  protected $selectedQuantileDataKey = signal<'threshold' | 'total'>('threshold');

  protected $selectedQuantileDataFormat = signal<'absolute' | 'relative'>('absolute');

  protected $selectedQuantileScale = signal<'linear' | 'log'>('log');

  protected $quantileDataFormat = computed(() => {
    const total = this.$groupStats()?.populationTotal;
    return total && this.$selectedQuantileDataFormat() === 'relative'
      ? 'percent:1.0-3'
      : undefined;
  });
}
