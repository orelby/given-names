import { Pipe, PipeTransform } from '@angular/core';
import { YearPeriod } from '@shared/models/year-periods';

@Pipe({
  name: 'yearPeriod',
  pure: true
})
export class YearPeriodPipe implements PipeTransform {

  transform(period: YearPeriod): string {
    const short = period.start
      + (period.start === period.end ? '' : `–${period.end}`);

    return short;
  }

}
