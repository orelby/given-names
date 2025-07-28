import { filter, firstValueFrom, tap } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
    AfterViewInit, ChangeDetectionStrategy, Component, computed,
    effect, inject, resource, signal, untracked, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, EventType, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { ScrollPositionStore } from 'src/app/core/scrolling/scroll-position-store';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
    NameSearchService, SearchMode, SoundexSearchMode,
    SEARCH_MODES, SOUNDEX_SEARCH_MODES,
} from '../name-search-service';

const DEFAULT_MIN_POPULATION = 100;
const DEFAULT_SEARCH_MODE: SearchMode = 'soundex';
const DEFAULT_SOUNDEX_MODE: SoundexSearchMode = 'exact';

@Component({
    selector: 'app-name-search',
    imports: [
        CommonModule, RouterModule, FormsModule, ReactiveFormsModule,
        MatFormFieldModule, MatInputModule, MatIconModule,
        MatRippleModule, MatButtonToggleModule,
        MatSelectModule, ScrollingModule,
        MatProgressSpinnerModule,
    ],
    templateUrl: './name-search.html',
    styleUrl: './name-search.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NameSearch implements AfterViewInit {
    private readonly router = inject(Router);

    private readonly $queryParams = toSignal(inject(ActivatedRoute).queryParamMap);

    private readonly nameSearchService = inject(NameSearchService);

    protected readonly $query = computed(() => {
        const query = this.$queryParams()?.get('query') ?? '';
        return query.length > 0 ? query : null;
    });

    protected readonly itemSize = 70;

    protected readonly minPopulationOptions = [5, 10, 50, 100, 1000];

    protected readonly $minPopulation = computed(() => {
        const queryArg = Number(
            this.$queryParams()?.get('min-population')
            ?? DEFAULT_MIN_POPULATION
        );

        return Number.isSafeInteger(queryArg)
            ? Math.max(queryArg, this.minPopulationOptions[0])
            : DEFAULT_MIN_POPULATION;
    });

    protected readonly $searchMode = computed(() => {
        const queryArg = this.$queryParams()?.get('mode')?.split('-', 1)?.[0];
        return SEARCH_MODES.find(mode => mode === queryArg)
            ?? DEFAULT_SEARCH_MODE;
    });

    protected readonly $soundexSearchMode = computed(() => {
        const queryArg = this.$queryParams()?.get('mode')?.split('-', 2)?.[1];
        return SOUNDEX_SEARCH_MODES.find(mode => mode === queryArg)
            ?? DEFAULT_SOUNDEX_MODE;
    });

    protected readonly $results = resource({
        params: () => ({
            query: this.$query(),
            minPopulation: this.$minPopulation(),
            searchMethod: this.$searchMode(),
            soundexSearchMethod: this.$soundexSearchMode(),
        }),

        loader: async ({ params, abortSignal }) => {
            if (params.query == null) return [];

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

    private readonly afterViewInit = signal(false);

    private readonly scrollPositionStore = inject(ScrollPositionStore);

    private readonly $restoreScrollToItemIndex = signal(0);

    private curScrollKey = this.router.url;

    private curScrolledIndex = 0;

    @ViewChild('resultsViewport', { read: CdkVirtualScrollViewport })
    private resultsViewport?: CdkVirtualScrollViewport;

    constructor() {
        // Save & restore results scroll position

        this.router.events.pipe(
            filter(event => event.type === EventType.NavigationStart),
            tap(navStart => {
                const scrollPosition = this.curScrolledIndex;
                if (scrollPosition) {
                    this.scrollPositionStore.set(this.curScrollKey, scrollPosition);
                } else {
                    this.scrollPositionStore.delete(this.curScrollKey);
                }
            }),
            takeUntilDestroyed(),
        ).subscribe();

        this.router.events.pipe(
            filter(event => event.type === EventType.NavigationEnd),
            tap(navEnd => {
                this.curScrollKey = navEnd.url;
                this.$restoreScrollToItemIndex.set(
                    this.scrollPositionStore.get(navEnd.url)
                );
            }),
            takeUntilDestroyed(),
        ).subscribe();

        effect(() => {
            const cachedIndex = this.$restoreScrollToItemIndex();

            if (!cachedIndex || !this.$length() || !this.afterViewInit()) {
                return;
            }

            this.$restoreScrollToItemIndex.set(0);

            setTimeout(() => {
                const containerOffset = this.resultsViewport!.measureViewportOffset();
                const offset = containerOffset + cachedIndex * this.itemSize;
                window?.scrollTo({ top: offset, behavior: 'instant' });
                this.curScrolledIndex = cachedIndex;
            }, 0);
        });
    }

    ngAfterViewInit(): void {
        this.afterViewInit.set(true);
    }

    search(value: string): void {
        this.router.navigate([], {
            queryParams: {
                query: value,
            },
            queryParamsHandling: 'merge',
        });
    }

    protected setSearchOption(
        key: 'mode' | 'soundex-mode' | 'min-population',
        value: string | number,
    ) {
        const params = key === 'mode' && value === 'soundex'
            ? { mode: `soundex-${untracked(this.$soundexSearchMode)}` }
            : key === 'soundex-mode'
                ? { mode: `soundex-${value}` }
                : { [key]: value };

        this.router.navigate([], {
            queryParams: params,
            queryParamsHandling: 'merge'
        });
    }

    protected onScrollIndexChange(index: number): void {
        this.curScrolledIndex = index;
    }
}
