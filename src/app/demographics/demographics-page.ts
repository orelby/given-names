import { environment } from 'src/environments/environment';
import { Component, computed, inject, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { httpResource } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule, MatLabel } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { religions, genders, DemographicGroupStats, getDemographicDescription } from '@shared/models/demographics';
import { YearPeriodPipe } from '@shared/pipes/year-period-pipe';
import { yearPeriods, fullDataPeriod } from '@shared/models/year-periods';
import { DemographicStats } from '@shared/models/demographics';
import { Chart, ChartDataAxis, ChartDataset } from "../core/chart/chart";

@Component({
  selector: 'app-demographics-page',
  standalone: true,
  imports: [
    RouterModule, FormsModule,
    MatChipsModule, MatLabel, MatFormFieldModule, MatInputModule, MatSelectModule,
    YearPeriodPipe, DecimalPipe,
    Chart, ChartDataset, ChartDataAxis,
  ],
  templateUrl: './demographics-page.html',
  styleUrl: './demographics-page.scss',
})
export class DemographicsPage {
  protected router = inject(Router);

  protected $queryParams = toSignal(inject(ActivatedRoute).queryParamMap);

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
    return yearPeriods.find(p => p.slug === slug) ?? fullDataPeriod
  });

  protected $genderSlug = computed(() => this.$gender().slug);
  protected $religionSlug = computed(() => this.$religion().slug);
  protected $periodSlug = computed(() => this.$period().slug);

  protected $demographicTitle = computed(() =>
    getDemographicDescription(this.$religion(), this.$gender())
  );

  protected readonly $stats = httpResource<DemographicStats>(
    () => `${environment.dataPath}/demographic-stats.json`
  );

  protected readonly $periodStats = computed(() => {
    const period = this.$period();
    return this.$stats.hasValue()
      ? this.$stats.value().periods.find(p =>
        p.yearPeriod.start === period.start && p.yearPeriod.end === period.end
      )
      : undefined;
  });

  protected readonly yearPeriods = yearPeriods;
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

  protected $deciles = computed(() => {
    const start = 0;
    const groupStats = this.$groupStats();
    return groupStats?.quantileThresholds.slice(start, 9).map((ceiling, i) => ({
      index: 1 + i,
      ceiling,
      total: groupStats.quantileTotals[i + start],
    }));
  });

  protected $topDeciles = computed(() => {
    const groupStats = this.$groupStats();
    const start = 9;
    return groupStats?.quantileThresholds.slice(start).map((ceiling, i) => ({
      index: `${91 + i}%`,
      ceiling,
      total: groupStats.quantileTotals[i + start],
    }));
  });
}
