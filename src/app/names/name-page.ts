import { switchMap, tap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Component, computed, input, Signal, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { religions, genders } from '@shared/models/demographics';
import { MatIcon } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { NameRepository } from './data-access/name-repository';
import { NameRecords } from '@shared/models/name-records';
import { NameCounts } from '@shared/models/stats/name-counts';
import { NamePeriodStats } from '@shared/models/stats/name-period-stats';
import { END_YEAR, START_YEAR } from '@shared/models/year-periods';
import { PeriodStatsRepository } from '../demographics/period-stats-repository';


@Component({
  selector: 'app-name-page',
  imports: [
    MatIcon, MatListModule, MatTooltipModule, MatCardModule, MatProgressSpinner,
    DecimalPipe, PercentPipe,
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

    return new NameCounts().withRecords(this.$records());
  });

  protected readonly $periodStats = computed(() => {
    if (this.$isLoading()) return undefined;

    const periodsStats = this.$periodsStats.value()!;

    return new NamePeriodStats(
      this.$stats()!,
      periodsStats.periods.find(p =>
        p.yearPeriod.start === START_YEAR && p.yearPeriod.end === END_YEAR
      )!,
      periodsStats.quantileLabels,
    );
  });

  protected readonly genders = genders;

  protected readonly religions = religions;
}
