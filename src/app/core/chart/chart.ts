import { DecimalPipe, CommonModule, PercentPipe } from '@angular/common';
import {
    AfterContentChecked,
    ChangeDetectionStrategy, Component, computed, ContentChildren, contentChildren, DestroyRef, Directive,
    effect, inject, Injector, input, PipeTransform, QueryList, Signal, signal, Type, ViewEncapsulation
} from '@angular/core';
import { BreakpointService } from './../breakpoints/breakpoint-service';
import { BREAKPOINTS } from '../breakpoints/breakpoints';
import { niceLinearTicks, niceLogTicks } from './ticks';
import { distinctUntilChanged, map, startWith, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { arraysEqual } from '@shared/utils/array';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

type ChartType = 'bar' | 'column' | 'bar-list';

interface DatasetConfig {
    // Can't rely on generic type shenanigans (since using an array of objects)
    data: readonly number[] | readonly object[];
    key?: keyof any;
}

class Dataset {
    readonly length: number;
    readonly get: (index: number) => number;

    constructor(
        data: DatasetConfig['data'],
        key: DatasetConfig['key']
    ) {
        this.length = data.length;

        if (key === undefined) {
            this.get = (index: number) => data[index] as number;
        } else {
            this.get = (index: number) => (data[index] as any)[key as any];
        }
    }

    *[Symbol.iterator]() {
        for (let i = 0; i < this.length; i++) {
            yield this.get(i);
        }
    }
}

@Directive({
    selector: 'app-chart-data-axis',
})
export class ChartDataAxis {
    readonly label = input.required<string>();
    readonly data = input<'index' | 'index-with-dot' | readonly string[] | readonly object[]>('index');
    readonly key = input<keyof any>();

    readonly length = signal(0);
    readonly tickLabels = computed(() => {
        const data = this.data();
        const key = this.key();

        return Array.from({ length: this.length() },
            typeof data === 'string'
                ? (_, i) => `${i + 1}${data === 'index-with-dot' ? '.' : ''}`
                : typeof key === 'undefined'
                    ? (_, i) => `${data[i]}`
                    : (_, i) => `${(data[i] as any)[key]}`
        );
    });
}

@Directive({
    selector: 'app-chart-dataset',
})
export class ChartDataset {
    readonly label = input.required<string>();
    readonly color = input<string>();
    readonly data = input.required<readonly number[] | readonly object[]>();
    readonly key = input<keyof any>();

    readonly dataset = computed(() => new Dataset(this.data(), this.key()));
}

@Component({
    selector: 'app-chart',
    templateUrl: './chart.html',
    styleUrls: ['./chart.scss'],
    imports: [CommonModule, MatProgressSpinner],
    providers: [DecimalPipe, PercentPipe],
    host: {
        '[class.chart]': 'true',
        '[class]': 'this.$mode()',
        '[style.--label-count]': 'this.dataAxes().length',
        '[style.--value-count]': 'this.$datasets().length',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
})
export class Chart implements AfterContentChecked {
    readonly mode = input<ChartType>('bar');

    readonly valueAxis = input<readonly number[] | 'log' | 'linear' | 'auto'>('auto');

    /**
     * Format of data values including value axis.
     * Supported formats: number or percent pipes.
     */
    readonly valueFormat = input<string | undefined>('number:1.0-2');

    /**
     * Max value for data normalization used when using percent in valueFormat.
     */
    readonly valueNorm = input<number | 'max'>('max');

    protected readonly $mode = computed(() => {
        const mode = this.mode();
        return this.$breakpointUp().minWidth < this.breakpoints.md
            ? (mode === 'column' ? 'bar' : mode)
            : mode;
    });

    @ContentChildren(ChartDataset, { emitDistinctChangesOnly: true })
    _datasets!: QueryList<ChartDataset>;

    protected readonly datasets = signal<ChartDataset[]>([]);

    @ContentChildren(ChartDataAxis, { emitDistinctChangesOnly: true })
    _dataAxes!: QueryList<ChartDataAxis>;

    protected readonly dataAxes = signal<ChartDataAxis[]>([]);

    protected readonly $length = computed(() => {
        const datasets = this.$datasets();
        return datasets.length === 0 ? 0 : datasets.reduce(
            (accMinLength, dataset) => Math.min(accMinLength, dataset.data.length), Infinity
        )
    });

    private rand = Math.random();

    protected readonly $datasets = computed(() => {
        return this.datasets().map(comp => {
            return ({
                label: comp.label(),
                color: comp.color(),
                data: comp.dataset(),
            })
        })
    });

    protected readonly $valueAxisTicks = computed(() => {
        const maxValueInput = this.maxValueFromInput();
        const maxDataValue = this.maxValueFromData();
        const normByInput = maxDataValue !== maxValueInput;

        const isPercent = this.valueFormat()?.startsWith('percent');

        const maxValue = isPercent
            ? (normByInput ? maxDataValue / maxValueInput : 1)
            : maxDataValue;

        const maxTicks = 6;

        const ticks = (this.valueAxis() === 'log')
            ? niceLogTicks(
                this.minNonZeroDataValue() / (isPercent ? maxValueInput : 1),
                maxValue,
                maxTicks
            )
            : niceLinearTicks(0, maxValue, maxTicks);

        const result = isPercent
            ? normByInput
                ? ticks.map(tick => tick * maxValueInput)
                : ticks.map(tick => tick * maxDataValue)
            : ticks;

        return result;
    });

    protected readonly $formatValue = computed<(value: number) => string>(() => {

        let f = this.valueFormat();

        // if (typeof f === 'function') return f;

        if (typeof f !== 'string') f = 'number:1.0-2';

        const [pipeName, ...args] = f.split(':');
        const pipe = this.injector.get(this.resolvePipe(pipeName));
        if (pipeName === 'percent') {
            const normValue = this.maxValueFromInput();
            return (value) => pipe.transform(value / normValue, ...args)
        } else {
            return (value) => pipe.transform(value, ...args);
        }
    })

    protected readonly $normalizeValue = computed<(value: number) => number>(() => {
        const normValue = this.maxValueForAxis() || 1;

        if (this.valueAxis() !== 'log') {
            return value => value / normValue;
        }

        /*
         * Realign log scale so that tick exponents are spaced evenly.
         *
         * - Shift exponents to align the non-zero ticks
         *   to (1, 2, 3, ...) * `tickExponentSpacing` / `exponentNorm`.
         */

        const ticks = this.$valueAxisTicks();

        const firstNonZeroTickExponent =
            Math.log10((ticks[1] ?? normValue) || 1);

        const tickExponentSpacing = ticks[2]
            ? (Math.log10(ticks[2]) - firstNonZeroTickExponent)
            : 1;

        const exponentShift = tickExponentSpacing - firstNonZeroTickExponent;

        const exponentNorm = Math.log10(normValue) + exponentShift;

        const minValue = 10 ** (-exponentShift);

        const normalize = (value: number) => value < minValue ? 0
            : (Math.log10(value) + exponentShift) / exponentNorm;

        /*
         * [COMMENTED OUT FOR PROSPERITY]
         *   
         * Shift and scale the 10 orders of magnitude
         * below the first non-zero tick to fill its lowest 1%.
         *   
         * But this is silly as 1% is too small anyway, could just clip.
         */

        /* 
        const lowExponentShift = -Math.log10(EPSILON);
        const lowExponentMin = 1 / 100;
        const lowExponentNorm = (lowExponentMin + lowExponentShift) * exponentNorm / lowExponentMin;

        const normalize = (value: number) => {
            if (value < EPSILON) {
                return 0;
            }

            const exponent = Math.log10(value) + exponentShift;

            if (exponent > lowExponentMin) {
                return exponent / exponentNorm;
            }

            return (exponent + lowExponentShift) / lowExponentNorm;
        };
        */

        return normalize;
    });

    private readonly maxValueFromData = computed(() => {
        return this.$datasets().reduce(
            (accMax, dataset) => Math.max(accMax, ...dataset.data), 0
        );
    });

    private readonly maxValueFromInput = computed(() => {
        const maxValueInput = this.valueNorm();

        return maxValueInput === 'max'
            ? this.maxValueFromData()
            : maxValueInput;
    });

    protected readonly maxValueForAxis = computed(() => {
        const maxValue = Math.max(
            this.maxValueFromData(),
            this.$valueAxisTicks().at(-1) ?? 0
        );

        return maxValue;
    })

    private readonly minNonZeroDataValue = computed(() => {
        let min = Infinity;

        for (const dataset of this.$datasets()) {
            for (const value of dataset.data) {
                if (value > 0 && value < min) {
                    min = value;
                }
            }
        }

        return Number.isFinite(min) ? min : 0;
    });

    private readonly $breakpointUp = inject(BreakpointService).$breakpointUp;

    private readonly breakpoints = inject(BREAKPOINTS);

    private readonly injector = inject(Injector);

    private readonly destroyRef = inject(DestroyRef);

    private contentChildrenInitialized = false;

    constructor() {
        effect(() => {
            const length = this.$length();
            this.dataAxes().forEach(axis => axis.length.set(length))
        });
    }

    ngAfterContentChecked(): void {
        if (!this.contentChildrenInitialized) {
            // Not using signal content queries (`contentChildren`)
            // because of a bug causing error NG0950 when using them in `effect`.
            // (NG0950: Required input is accessed before a value is set)
            // https://github.com/angular/angular/issues/59067

            this.contentChildrenInitialized = true;

            this._dataAxes.changes.pipe(
                startWith(this._dataAxes),
                map(q => q.toArray() as ChartDataAxis[]),
                distinctUntilChanged(arraysEqual),
                tap(a => this.dataAxes.set(a)),
                takeUntilDestroyed(this.destroyRef),
            ).subscribe();

            this._datasets.changes.pipe(
                startWith(this._datasets),
                map(q => q.toArray() as ChartDataset[]),
                distinctUntilChanged(arraysEqual),
                tap(a => this.datasets.set(a)),
                takeUntilDestroyed(this.destroyRef),
            ).subscribe();
        }
    }

    private resolvePipe(name: string): Type<PipeTransform> {
        switch (name) {
            case 'number': return DecimalPipe;
            case 'percent': return PercentPipe;
            default: throw new Error(`Unsupported pipe: ${name}`);
        }
    }
}
