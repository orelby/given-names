import { Inject, Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { environment } from "src/environments/environment";
import { map, Observable, shareReplay, switchMap, tap } from "rxjs";
import {
    Demographic, SingleDemographic,
    parseGender, parseReligion
} from "@shared/models/demographics";
import { NameRecord, NameRecords } from "@shared/models/name-records";
import { fromPromise } from "rxjs/internal/observable/innerFrom";
import { isPlatformBrowser } from "@angular/common";
import { PLATFORM_ID } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class NameRepository {
    private shouldChunkInit: boolean;

    private init$: Observable<any>;

    private byDemographic: Map<SingleDemographic, NameRecord[]> = new Map();

    private byName: Map<string, NameRecord[]> = new Map();

    constructor(
        http: HttpClient,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.shouldChunkInit = isPlatformBrowser(platformId);

        this.init$ = http.get(
            `${environment.dataPath}/given-names.csv`,
            { responseType: 'text' }
        ).pipe(
            // tap(() => console.time('NameRepository.initFromCsv')),
            switchMap(csv => fromPromise(this.initFromCsv(csv))),
            // tap(() => console.timeEnd('NameRepository.initFromCsv')),
            shareReplay(1)
        );
    }

    getByName(name: string): Observable<NameRecords> {
        return this.init$.pipe(map(
            () => this.byName.get(name) ?? []
        ));
    }

    getByNameAndDemographic(
        name: string,
        demographic: Demographic
    ): Observable<NameRecords | undefined> {
        return this.getByName(name).pipe(map(
            records => records.filter(r => demographic & r.demographic)
        ));
    }

    getByDemographic(demographic: SingleDemographic): Observable<NameRecords> {
        return this.init$.pipe(map(
            () => this.byDemographic.get(demographic) ?? []
        ));
    }

    getAllByDemographic(): Observable<ReadonlyMap<SingleDemographic, NameRecords>> {
        return this.init$.pipe(map(
            () => this.byDemographic
        ));
    }

    private async initFromCsv(csv: string): Promise<void> {
        const lines = csv.split('\n');

        for (let i = 1; i < lines.length; i++) {
            if (this.shouldChunkInit && (i & 1023) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
                // await scheduler.yield();
            }

            const fields = lines[i].trim().split(',');

            if (fields.length < 5) continue;

            const [gender, religion, name, total, ...yearTotals] = fields;

            const demographic = parseGender(gender) | parseReligion(religion);

            const record: NameRecord = {
                demographic,
                name,
                total: Number(total),
                yearTotals: yearTotals.map(Number)
            };

            if (!this.byDemographic.has(demographic)) {
                this.byDemographic.set(demographic, []);
            }

            this.byDemographic.get(demographic)!.push(record);

            if (!this.byName.has(name)) {
                this.byName.set(name, []);
            }

            this.byName.get(name)!.push(record);
        }
    }
}
