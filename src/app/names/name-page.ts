import { switchMap, tap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Component, computed, input, Signal, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { NameRecords } from '@shared/models/name-records';
import { NameRepository } from './name-repository';
import {
  GenderBitmasks, ReligionBitmasks, Religion,
  religions, genders
} from '@shared/models/demographics';
import { MatIcon } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { MatProgressSpinner } from '@angular/material/progress-spinner';


@Component({
  selector: 'app-name-page',
  imports: [MatIcon, MatListModule, MatTooltip, MatCardModule, DecimalPipe, MatProgressSpinner, NgTemplateOutlet],
  templateUrl: './name-page.html',
  styleUrl: './name-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NamePage {
  readonly name = input.required<string>();

  protected readonly $isLoading = signal(true);

  protected readonly $records: Signal<NameRecords> = toSignal(
    toObservable(this.name).pipe(
      tap(() => this.$isLoading.set(true)),
      switchMap(name => this.nameRepository.getByName(name)),
      tap(() => this.$isLoading.set(false)),
    ),
    { initialValue: [] }
  );

  protected readonly $totalByGenderByReligion = computed(() => {
    const religions = Object.values(ReligionBitmasks);
    const genders = Object.values(GenderBitmasks);

    const totals = Object.fromEntries(religions.map(religion =>
      [religion, Object.fromEntries(genders.map(gender => [gender, 0]))]
    ));

    this.$records().forEach(record => {
      const religion = record.demographic & ReligionBitmasks.All;
      const gender = record.demographic & GenderBitmasks.All;
      totals[religion][gender] += record.total;
      totals[religion][GenderBitmasks.All] += record.total;
      totals[ReligionBitmasks.All][gender] += record.total;
      totals[ReligionBitmasks.All][GenderBitmasks.All] += record.total;
    });

    return totals;
  });

  protected readonly genders = genders;

  protected readonly religions = religions;

  protected readonly nameRepository = inject(NameRepository);

  getGenderRatio(religion: Religion): number {
    const r = this.$totalByGenderByReligion()[religion.bitmask];
    const female = r[GenderBitmasks.Women];
    const total = r[GenderBitmasks.All];
    return female / total;
  }

  getReligionTotal(religion: Religion): number {
    return this.$totalByGenderByReligion()[religion.bitmask][GenderBitmasks.All];
  }
}
