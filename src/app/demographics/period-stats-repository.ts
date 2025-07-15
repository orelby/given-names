import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AllPeriodStats } from '@shared/models/stats/period-stats';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class PeriodStatsRepository {
    private readonly resource = httpResource<AllPeriodStats>(
        () => `${environment.dataPath}/demographic-stats.json`
    ).asReadonly();

    getAll() {
        return this.resource;
    }
}
