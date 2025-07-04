import { fromPromise } from "rxjs/internal/observable/innerFrom";
import { map, Observable, shareReplay, switchMap, tap } from "rxjs";
import { inject, Injectable, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { HttpClient } from '@angular/common/http';
import { environment } from "src/environments/environment";
import { Demographic, SingleDemographic } from "@shared/models/demographics";
import { NameRecords } from "@shared/models/name-records";
import { NameCsvRepository } from "./name-csv-repository";

@Injectable({
    providedIn: 'root'
})
export class NameRepository {
    private readonly init$: Observable<unknown>;

    private readonly repo: NameCsvRepository = new NameCsvRepository();

    constructor() {
        const shouldChunkLoad = isPlatformBrowser(inject(PLATFORM_ID));

        this.init$ = inject(HttpClient).get(
            `${environment.dataPath}/given-names.csv`,
            { responseType: 'text' }
        ).pipe(
            // tap(() => console.time('NameRepository loadFromCsv')),
            switchMap(csv => fromPromise(this.repo.loadFromCsv(csv, shouldChunkLoad))),
            // tap(() => console.timeEnd('NameRepository loadFromCsv')),
            shareReplay(1)
        );
    }

    getByName(name: string): Observable<NameRecords> {
        return this.init$.pipe(map(
            () => this.repo.getByName(name)
        ));
    }

    getByNameAndDemographic(
        name: string,
        demographic: Demographic
    ): Observable<NameRecords | undefined> {
        return this.init$.pipe(map(
            () => this.repo.getByNameAndDemographic(name, demographic)
        ));
    }

    getByDemographic(demographic: SingleDemographic): Observable<NameRecords> {
        return this.init$.pipe(map(
            () => this.repo.getByDemographic(demographic)
        ));
    }

    getAllByName() {
        return this.init$.pipe(map(
            () => this.repo.getAllByName()
        ));
    }
}
