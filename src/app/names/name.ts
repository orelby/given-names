import { concatWith, of, switchMap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Component, computed, input, Signal } from '@angular/core';
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
import { DecimalPipe } from '@angular/common';


@Component({
  selector: 'app-name',
  imports: [MatIcon, MatListModule, MatTooltip, MatCardModule, DecimalPipe],
  templateUrl: './name.html',
  styleUrl: './name.scss'
})
export class Name {
  readonly name = input.required<string>();

  protected readonly $records: Signal<NameRecords> = toSignal(
    toObservable(this.name).pipe(
      switchMap(name => of([]).pipe(  // clear records, then load
        concatWith(this.nameRepository.getByName(name))
      )),
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

  constructor(protected nameRepository: NameRepository) { }

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
