import { Component, computed, input, Signal, inject, signal, model, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';

import { religions, genders, Religion, GenderBitmasks, ReligionBitmasks, Gender, DemographicGroupStats, getDemographicDescription } from '@shared/models/demographics';
import { DemographicStats } from '@shared/models/demographics';
import { environment } from 'src/environments/environment';
import { catchError, map, of, retry, shareReplay, startWith, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { MatListItem, MatNavList } from '@angular/material/list';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatInputModule, MatLabel } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { fullDataPeriod, YearPeriod, yearPeriods } from '@shared/models/year-periods';
import { YearPeriodPipe } from '@shared/pipes/year-period-pipe';
import { MatChipsModule } from '@angular/material/chips';
import { BarChart } from "../core/bar-chart/bar-chart";

@Component({
  selector: 'app-demographic-stats',
  standalone: true,
  imports: [MatChipsModule, MatCardModule, MatIcon, MatTabsModule, DecimalPipe,
    RouterModule, MatFormFieldModule, MatSelectModule,
    MatInputModule, FormsModule, MatLabel,
    YearPeriodPipe, BarChart],
  templateUrl: './demographics-dashboard.html',
  styleUrl: './demographics-dashboard.scss',
})
export class DemographicsDashboard {
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
  protected readonly GenderBitmasks = GenderBitmasks;
  protected readonly ReligionBitmasks = ReligionBitmasks;
  protected readonly Math = Math;

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

  protected getDecileFields(groupStats: DemographicGroupStats) {
    const start = 0;
    return groupStats.quantileThresholds.slice(start, 9).map((ceiling, i) => ({
      index: 1 + i,
      ceiling,
      total: groupStats.quantileTotals[i + start],
    }));
  }

  protected getTopDecileFields(groupStats: DemographicGroupStats) {
    const start = 9;
    return groupStats.quantileThresholds.slice(start).map((ceiling, i) => ({
      index: 91 + i,
      ceiling,
      total: groupStats.quantileTotals[i + start],
    }));
  }
}
