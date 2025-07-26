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
import { NameSuggestionService } from '../name-suggestion-service';
import { NameRepository } from '../data-access/name-repository';


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
    protected readonly itemSize = 70;

    private readonly router = inject(Router);

    private readonly namSuggestionService = inject(NameSuggestionService);

    private readonly names = toSignal(inject(NameRepository).getAllByName());

    protected readonly nameControl = new FormControl('');

    protected readonly query = signal('');

    protected readonly $results = resource({
        params: () => ({
            name: this.query(),
            names: this.names(),
            populationThreshold: this.populationThreshold(),
            matchType: this.matchType(),
        }),

        loader: async ({ params }) => {
            const names = params.names;
            if (!names) return [];
            // delete this            
            return await firstValueFrom(forkJoin([
                this.namSuggestionService.suggestSimilarNames(params.name, Infinity).pipe(
                    map(results => results.filter(result =>
                        names.get(result)!.reduce(
                            (acc, cur) => acc + cur.total, 0
                        ) >= params.populationThreshold
                    ))
                ),
                timer(200),
            ]).pipe(map(([data, _]) => data)));
        },
    });

    protected readonly pageSizeOptions = [10, 20, 50, 100];

    protected readonly $pageIndex = signal(0);

    protected readonly $pageSize = signal(10);

    protected readonly $length = computed(
        () => this.$results.value()?.length ?? 0
    );

    protected readonly populationThresholdOptions = [5, 10, 50, 100, 1000];

    protected readonly matchTypeOptions = [
        { slug: 'soundex-full', text: 'שמות דומים' },
        { slug: 'exact-infix', text: 'חיפוש מדויק' },
        { slug: 'soundex-prefix', text: 'שמות דומים (תחילית)' },
        { slug: 'exact-prefix', text: 'חיפוש מדויק (תחילית)' },
    ];

    protected readonly matchTypeSlug = signal('soundex-full');

    protected readonly matchType = computed(() => {
        const slug = this.matchTypeSlug();
        return this.matchTypeOptions.find(option => option.slug === slug)!;
    });

    protected readonly populationThreshold = signal(100);

    private readonly scrollPositionStore = inject(ScrollPositionStore);

    private readonly afterViewInit = signal(false);

    private isResultViewportInitialized = false;

    @ViewChild('resultsViewport', { read: CdkVirtualScrollViewport })
    private resultsViewport?: CdkVirtualScrollViewport;

    constructor(route: ActivatedRoute) {
        const params = route.snapshot.queryParamMap;

        const name = params.get('query') ?? '';
        this.nameControl.setValue(name);
        this.query.set(name);

        const populationThreshold = parseInt(params.get('populationThreshold') ?? '');
        if (this.populationThresholdOptions.includes(populationThreshold)) {
            this.populationThreshold.set(populationThreshold);
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
            this.router.navigate([], {
                queryParams: {
                    'query': this.query(),
                    'populationThreshold': this.populationThreshold(),
                },
                queryParamsHandling: 'merge'
            });
        });
    }

    ngAfterViewInit(): void {
        this.afterViewInit.set(true);
    }

    search(): void {
        this.query.set(this.nameControl.value || '');
    }

    protected onScrollIndexChange(index: number): void {
        if (!this.isResultViewportInitialized) return;
        this.scrollPositionStore.set(this.router.url, index);
    }
}
