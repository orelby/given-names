import { DecimalPipe, CommonModule, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChildren, Directive, inject, Injector, input, Type, ViewEncapsulation } from '@angular/core';
import { BreakpointService } from './../breakpoints/breakpoint-service';
import { BREAKPOINTS } from '../breakpoints/breakpoints';
import { arraysEqual } from '@shared/utils/array';

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

export type DataAxisConfig = ({
    readonly label: string;
    readonly data: 'index' | 'index-with-dot';
} | DatasetConfig)[];

export type ValueAxisConfig = {
    label?: string;
    scale?: 'linear' | 'log';
    tickLabels?: 'auto' | 'log' | 'linear' | DatasetConfig;
}

@Directive({
    selector: 'app-chart-data-axis',
})
export class ChartDataAxis {
    readonly label = input.required<string>();
    readonly data = input<'index' | 'index-with-dot' | readonly string[] | readonly object[]>('index');
    readonly key = input<keyof any>();

    readonly tickLabels = computed(() => {
        const data = this.data();
        const key = this.key();

        return Array.from({ length: data.length }, typeof data === 'string'
            ? (_, i) => `${i + 1}${data === 'index-with-dot' ? '.' : ''}`
            : key
                ? (_, i) => `${(data[i] as any)[key]}`
                : (_, i) => `${data[i]}`
        );
    });
}

@Directive({
    selector: 'app-chart-dataset',
    providers: [DecimalPipe, PercentPipe]
})
export class ChartDataset {
    readonly label = input.required<string>();
    readonly color = input<string>();
    readonly data = input.required<readonly number[] | readonly object[]>();
    readonly key = input<keyof any>();
    readonly format = input<string | ((value: number) => string)>();

    readonly dataset = computed(() => new Dataset(this.data(), this.key()));

    readonly formatter = computed<(value: number) => string>(() => {
        let f = this.format();

        if (typeof f === 'function') return f;

        if (typeof f !== 'string') f = 'number:1.0-2';

        const [pipeName, ...args] = f.split(':');
        const pipe = this.injector.get<any>(this.resolvePipe(pipeName));
        return (value) => pipe.transform(value, ...args);
    })

    private injector = inject(Injector);

    private resolvePipe(name: string): Type<any> {
        switch (name.trim()) {
            case 'number': return DecimalPipe;
            case 'percent': return PercentPipe;
            default: throw new Error(`Unsupported pipe: ${name}`);
        }
    }
}

@Component({
    selector: 'app-chart',
    templateUrl: './chart.html',
    styleUrls: ['./chart.scss'],
    imports: [CommonModule],
    host: {
        '[class.chart]': 'true',
        '[class]': 'this.$curMode()',
        '[style.--label-count]': 'this.dataAxes().length',
        '[style.--value-count]': 'this.$datasets().length',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
})
export class Chart {
    readonly mode = input<ChartType>('bar');

    readonly datasets = contentChildren<ChartDataset>(ChartDataset);

    readonly dataAxes = contentChildren<ChartDataAxis>(ChartDataAxis);

    readonly valueAxis = input<readonly number[] | 'log-scale' | 'linear-scale' | 'auto'>('auto');

    protected readonly $curMode = computed(() => {
        return this.$breakpointUp().minWidth < this.breakpoints.md
            ? this.mode().replace('column', 'bar')
            : this.mode();
    });

    protected readonly $datasets = computed(
        () => this.datasets().map(comp => ({
            label: comp.label(),
            color: comp.color(),
            dataset: comp.dataset(),
            formatter: comp.formatter(),
        }))
    );

    protected readonly $length = computed(() => Math.max(0,
        this.$datasets().reduce(
            (accMinLength, dataset) => Math.min(accMinLength, dataset.dataset.length), Infinity
        )
    ));

    protected readonly $maxValue = computed(() => this.$datasets().reduce(
        (accMax, dataset) => Math.max(accMax, ...dataset.dataset), 0
    ) || 1)

    private readonly $breakpointUp = inject(BreakpointService).$breakpointUp;

    private readonly breakpoints = inject(BREAKPOINTS);

}
