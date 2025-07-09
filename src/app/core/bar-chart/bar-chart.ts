import { DecimalPipe, CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface ChartField {
    readonly key: string;
    readonly label?: string;
    readonly isValue?: boolean;
    readonly color?: string;
}

@Component({
    selector: 'bar-chart',
    templateUrl: './bar-chart.html',
    styleUrls: ['./bar-chart.scss'],
    imports: [CommonModule, DecimalPipe],
})
export class BarChart {
    @Input() data = [] as any[];
    @Input() primaryAxis: Pick<ChartField, 'key' | 'label'> | 'index' | null = 'index';
    @Input() fields = [] as ChartField[];
    @Input() mode = 'bar' as 'bar' | 'column' | 'bar-list';

    get labelFields() {
        return this.fields.filter(f => !f.isValue);
    }

    get valueFields() {
        return this.fields.filter(f => f.isValue);
    }

    get maxValuePerField() {
        const result: Record<string, number> = {};
        for (const field of this.valueFields) {
            result[field.key] = Math.max(...this.data.map(d => d[field.key] ?? 0));
        }
        return result;
    }
}
