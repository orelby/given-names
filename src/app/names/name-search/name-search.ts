import { forkJoin, map, timer, firstValueFrom } from 'rxjs';
import {
    AfterViewInit, ChangeDetectionStrategy, Component, computed,
    effect, inject, resource, signal, ViewChild
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { ScrollPositionStore } from 'src/app/core/scrolling/scroll-position-store';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NameSearchService, SearchOptions } from '../name-search-service';

const DEFAULT_MIN_POPULATION = 100;
const DEFAULT_SOUNDEX_MODE: SearchOptions['soundexMode'] = 'exact';

@Component({
    selector: 'app-name-search',
    imports: [
        CommonModule, RouterModule, FormsModule, ReactiveFormsModule,
        MatFormFieldModule, MatInputModule, MatIconModule,
        MatRippleModule, MatButtonToggleModule, MatButtonModule,
        MatSelectModule, ScrollingModule,
        MatProgressSpinnerModule,
    ],
    templateUrl: './name-search.html',
    styleUrl: './name-search.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NameSearch implements AfterViewInit {
    private readonly router = inject(Router);

    private readonly nameSearchService = inject(NameSearchService);

    protected readonly nameControl = new FormControl('');

    protected readonly $query = signal('');

    protected readonly $results = resource({
        params: () => ({
            query: this.$query(),
            minPopulation: this.$minPopulation(),
            searchMethod: this.$searchMethod(),
            soundexSearchMethod: this.$soundexSearchMethod(),
        }),

        loader: async ({ params, abortSignal }) => {
            if (params.query.length < 1) return [];

            return firstValueFrom(
                this.nameSearchService.search(params.query, {
                    maxResults: Infinity,
                    minPopulation: params.minPopulation,
                    mode: params.searchMethod,
                    soundexMode: params.soundexSearchMethod,
                    abortSignal,
                })
            );
        },
    });

    protected readonly $length = computed(
        () => this.$results.value()?.length ?? 0
    );

    protected readonly itemSize = 70;

    protected readonly minPopulationOptions = [5, 10, 50, 100, 1000];

    protected readonly $minPopulation = signal(DEFAULT_MIN_POPULATION);

    protected readonly $searchMethod = signal<'soundex' | 'phrase'>('soundex');

    protected readonly $soundexSearchMethod = signal(DEFAULT_SOUNDEX_MODE);

    private readonly scrollPositionStore = inject(ScrollPositionStore);

    private readonly afterViewInit = signal(false);

    private isResultViewportInitialized = false;

    @ViewChild('resultsViewport', { read: CdkVirtualScrollViewport })
    private resultsViewport?: CdkVirtualScrollViewport;

    constructor(route: ActivatedRoute) {
        const params = route.snapshot.queryParamMap;

        const name = params.get('query') ?? '';
        this.nameControl.setValue(name);
        this.$query.set(name);

        const populationThreshold = parseInt(params.get('minPopulation') ?? '');
        if (this.minPopulationOptions.includes(populationThreshold)) {
            this.$minPopulation.set(populationThreshold);
        }

        const cachedIndex = this.scrollPositionStore.get(this.router.url);

        effect(() => {
            if (this.isResultViewportInitialized
                || this.$length() === 0
                || !this.afterViewInit()
            ) return;

            this.isResultViewportInitialized = true;

            if (!cachedIndex) return;

            setTimeout(() => {
                const offset = cachedIndex * this.itemSize + this.resultsViewport!.measureViewportOffset();
                window?.scrollTo({ top: offset, behavior: 'auto' });
                this.onScrollIndexChange(cachedIndex);
            }, 0);
        });

        effect(() => {
            const params: Record<string, string | number> = {};

            const query = this.$query();
            if (query.length > 0) {
                params['query'] = query;
            }

            const minPopulation = this.$minPopulation();
            if (minPopulation !== DEFAULT_MIN_POPULATION) {
                params['minPopulation'] = minPopulation;
            }

            const mode = this.$searchMethod();
            const soundexMode = this.$soundexSearchMethod();
            if (mode === 'phrase') {
                params['mode'] = mode;
            } else if (soundexMode !== DEFAULT_SOUNDEX_MODE) {
                params['mode'] = `${mode}-${soundexMode}`;
            }

            this.router.navigate([], {
                queryParams: params,
                queryParamsHandling: 'replace',
            });
        });
    }

    ngAfterViewInit(): void {
        this.afterViewInit.set(true);
    }

    search(): void {
        this.$query.set(this.nameControl.value || '');
    }

    protected onScrollIndexChange(index: number): void {
        if (!this.isResultViewportInitialized) return;
        this.scrollPositionStore.set(this.router.url, index);
    }
}
