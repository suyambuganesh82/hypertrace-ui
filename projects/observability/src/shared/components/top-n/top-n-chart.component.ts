import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { TypedSimpleChanges } from '@hypertrace/common';
import { maxBy } from 'lodash';

@Component({
  selector: 'ht-top-n-chart',
  styleUrls: ['./top-n-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="top-n-chart">
      <ng-container *ngFor="let item of this.itemOptions">
        <div class="border-top"></div>
        <div
          class="label"
          [htcTooltip]="item.label"
          (click)="this.onLabelClick(item.label)"
          [ngClass]="{ clickable: this.labelClickable }"
        >
          {{ item.label }}
        </div>
        <div class="progress">
          <div class="progress-value" [ngStyle]="{ width: item.width }"></div>
        </div>
        <div class="value">
          <span>{{ item.value | htcDisplayNumber }} ({{ item.width }})</span>
        </div>
      </ng-container>
    </div>
  `
})
export class TopNChartComponent implements OnChanges {
  @Input()
  public data: TopNData[] = [];

  @Input()
  public labelClickable: boolean = false;

  @Output()
  public readonly labelClick: EventEmitter<string> = new EventEmitter();

  public itemOptions: TopNItemOptions[] = [];

  public ngOnChanges(changes: TypedSimpleChanges<this>): void {
    if (changes.data && this.data) {
      this.buildItemOptions();
    }
  }

  public onLabelClick(label: string): void {
    this.labelClickable && this.labelClick.emit(label);
  }

  private buildItemOptions(): void {
    this.itemOptions = [];
    if (this.data.length === 0) {
      return;
    }

    let maxValue = maxBy(this.data, option => option.value)?.value;
    if (maxValue === undefined || maxValue === 0) {
      maxValue = 1;
    }

    this.itemOptions = this.data
      .sort((first, second) => second.value - first.value)
      .map(
        (option): TopNItemOptions => ({
          label: option.label,
          width: `${((option.value / maxValue!) * 100).toFixed(2)}%`,
          value: option.value
        })
      );
  }
}
export interface TopNData {
  label: string;
  value: number;
}

interface TopNItemOptions extends TopNData {
  width: string;
}
