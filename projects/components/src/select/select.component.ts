import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  QueryList
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconType } from '@hypertrace/assets-library';
import { LoggerService, queryListAndChanges$, SubscriptionLifecycle, TypedSimpleChanges } from '@hypertrace/common';
import { isEmpty, isEqual } from 'lodash-es';
import { BehaviorSubject, combineLatest, EMPTY, merge, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ButtonSize, ButtonStyle, ButtonVariant } from '../button/button';
import { IconSize } from '../icon/icon-size';
import { SearchBoxDisplayMode } from '../search-box/search-box.component';
import { SelectControlOptionComponent, SelectControlOptionPosition } from './select-control-option.component';
import { SelectGroupPosition } from './select-group-position';
import { SelectJustify } from './select-justify';
import { SelectOption } from './select-option';
import { SelectOptionComponent } from './select-option.component';
import { SelectSize } from './select-size';

@Component({
  selector: 'ht-select',
  styleUrls: ['./select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    SubscriptionLifecycle,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: SelectComponent,
      multi: true
    }
  ],
  template: `
    <div
      class="select"
      [attr.aria-disabled]="this.disabled"
      *htLetAsync="this.selected$ as selected"
      [ngClass]="[
        this.size,
        this.groupPosition,
        selected ? selected.style.toString() : '',
        this.showBorder ? 'border' : '',
        this.disabled ? 'disabled' : '',
        this.popoverOpen ? 'open' : ''
      ]"
    >
      <ht-popover
        [disabled]="this.disabled"
        [closeOnClick]="true"
        class="select-container"
        (popoverOpen)="this.popoverOpen = true"
        (popoverClose)="this.onPopoverClose()"
        [ngSwitch]="this.triggerDisplayMode"
      >
        <ht-popover-trigger>
          <div class="trigger-container" #triggerContainer>
            <div
              *ngSwitchCase="'${SelectTriggerDisplayMode.MenuWithBorder}'"
              class="trigger-content menu-with-border"
              [ngClass]="[this.justifyClass]"
            >
              <ng-container
                [ngTemplateOutlet]="selected?.selectOptionRenderer?.getTemplateRef() ?? defaultMenuWithBorderTriggerTemplate"
              ></ng-container>
              <ht-icon class="trigger-icon" icon="${IconType.ChevronDown}" size="${IconSize.ExtraSmall}"></ht-icon>
              <ng-template #defaultMenuWithBorderTriggerTemplate>
                <ht-icon
                  *ngIf="this.getPrefixIcon(selected)"
                  class="trigger-prefix-icon"
                  [icon]="this.getPrefixIcon(selected)"
                  [size]="this.iconSize"
                  [color]="selected?.iconColor"
                  [borderType]="selected?.iconBorderType"
                  [borderColor]="selected?.iconBorderColor"
                  [borderRadius]="selected?.iconBorderRadius"
                >
                </ht-icon>
                <ht-label
                  class="trigger-label"
                  [label]="selected?.selectedLabel || selected?.label || this.placeholder"
                >
                </ht-label>
              </ng-template>
            </div>
            <div
              *ngSwitchCase="'${SelectTriggerDisplayMode.Icon}'"
              class="trigger-content icon-only"
              [ngClass]="{ selected: this.selected !== undefined, open: this.popoverOpen }"
            >
              <ht-icon
                class="icon"
                *ngIf="this.icon"
                [icon]="this.icon"
                [size]="this.iconSize"
                [htTooltip]="this.selected?.label || this.placeholder"
              >
              </ht-icon>
            </div>
            <div
              *ngSwitchCase="'${SelectTriggerDisplayMode.MenuWithBackground}'"
              class="trigger-content menu-with-background"
              [ngClass]="[this.justifyClass]"
            >
              <ng-container
                [ngTemplateOutlet]="selected?.selectOptionRenderer?.getTemplateRef() ?? defaultMenuWithBackgroundTriggerTemplate"
              ></ng-container>
              <ng-template #defaultMenuWithBackgroundTriggerTemplate>
                <ht-label
                  class="trigger-label"
                  [label]="selected?.selectedLabel || selected?.label || this.placeholder"
                >
                </ht-label>
              </ng-template>
              <ht-icon class="trigger-icon" icon="${IconType.ChevronDown}" size="${IconSize.ExtraSmall}"></ht-icon>
            </div>
          </div>
        </ht-popover-trigger>
        <ht-popover-content>
          <div class="select-content" [ngStyle]="{ 'minWidth.px': triggerContainer.offsetWidth }">
            <ng-container
              *ngIf="
                this.searchMode !== '${SelectSearchMode.Disabled}' &&
                ((this.allOptions$ | async)?.length > 5 || !(this.searchText | htIsEmpty))
              "
            >
              <ht-event-blocker event="click" [enabled]="true">
                <ht-search-box
                  class="search-bar"
                  [value]="this.searchText"
                  (valueChange)="this.searchOptions($event)"
                  [debounceTime]="200"
                  displayMode="${SearchBoxDisplayMode.NoBorder}"
                ></ht-search-box>
              </ht-event-blocker>
              <ht-divider class="divider"></ht-divider>
            </ng-container>
            <ht-button
              class="clear-selected"
              *ngIf="this.showClearSelected && this.selected !== undefined"
              variant="${ButtonVariant.Primary}"
              display="${ButtonStyle.Text}"
              size="${ButtonSize.ExtraSmall}"
              label="Clear Selected"
              (click)="this.onClearSelected()"
            ></ht-button>

            <ng-container *htLetAsync="this.topControlItems$ as topControlItems">
              <div *ngIf="topControlItems?.length !== 0">
                <ng-container
                  *ngTemplateOutlet="itemsTemplate; context: { items: topControlItems, showSelectionStatus: false }"
                ></ng-container>

                <ht-divider></ht-divider>
              </div>
            </ng-container>

            <ng-container
              *ngTemplateOutlet="
                itemsTemplate;
                context: { items: (this.filteredOptions$ | async), showSelectionStatus: true }
              "
            ></ng-container>
          </div>
          <ng-template #itemsTemplate let-items="items" let-showSelectionStatus="showSelectionStatus">
            <div
              *ngFor="let item of items"
              (click)="this.onSelectionChange(item)"
              class="select-option"
              [ngClass]="this.getStyleClassesForSelectItem | htMemoize: this.size:item"
            >
              <ng-container
                *ngTemplateOutlet="item.selectOptionRenderer?.getTemplateRef() ?? defaultSelectOptionTemplate; context: {$implicit: item}"
              ></ng-container>
              <ht-icon
                class="status-icon"
                *ngIf="showSelectionStatus && this.highlightSelected && this.isSelectedItem(item)"
                icon="${IconType.Done}"
                size="${IconSize.Small}"
              ></ht-icon>
            </div>
          </ng-template>

          <ng-template #defaultSelectOptionTemplate let-item>
            <div class="select-option-info">
              <ht-icon
                *ngIf="item.icon"
                class="icon"
                [icon]="item.icon"
                [size]="item.iconSize"
                [color]="item.iconColor"
                [borderType]="item?.iconBorderType"
                [borderColor]="item?.iconBorderColor"
                [borderRadius]="item?.iconBorderRadius"
              >
              </ht-icon>
              <span class="label">{{ item.label }}</span>
            </div>
          </ng-template>
        </ht-popover-content>
      </ht-popover>
    </div>
  `
})
export class SelectComponent<V> implements ControlValueAccessor, AfterContentInit, OnChanges {
  @Input()
  public size: SelectSize = SelectSize.Medium;

  @Input()
  public selected?: V;

  @Input()
  public icon?: string;

  @Input()
  public iconSize?: IconSize = IconSize.Small;

  @Input()
  public triggerDisplayMode?: SelectTriggerDisplayMode = SelectTriggerDisplayMode.MenuWithBorder;

  @Input()
  public placeholder?: string;

  @Input()
  public disabled: boolean = false;

  @Input()
  public showBorder: boolean = false;

  @Input()
  public showClearSelected: boolean = false;

  @Input()
  public justify?: SelectJustify;

  @Input()
  public highlightSelected: boolean = true;

  @Input()
  public searchMode: SelectSearchMode = SelectSearchMode.Disabled;

  @Output()
  public readonly selectedChange: EventEmitter<V | undefined> = new EventEmitter<V | undefined>();

  @Output()
  public readonly searchValueChange: EventEmitter<string> = new EventEmitter<string>();

  @ContentChildren(SelectOptionComponent)
  private readonly allOptionsList?: QueryList<SelectOptionComponent<V>>;
  public allOptions$: Observable<QueryList<SelectOptionComponent<V>>> = EMPTY;
  public filteredOptions$!: Observable<SelectOptionComponent<V>[]>;

  @ContentChildren(SelectControlOptionComponent)
  public controlItems?: QueryList<SelectControlOptionComponent<V>>;

  public selected$?: Observable<SelectOption<V> | undefined>;
  private propagateControlValueChange?: (value: V | undefined) => void;
  private propagateControlValueChangeOnTouch?: (value: V | undefined) => void;

  public groupPosition: SelectGroupPosition = SelectGroupPosition.Ungrouped;

  public topControlItems$?: Observable<SelectControlOptionComponent<V>[]>;
  private readonly caseInsensitiveSearchSubject: BehaviorSubject<string> = new BehaviorSubject('');
  public searchText: string = '';

  public popoverOpen: boolean = false;

  public get justifyClass(): string {
    if (this.justify !== undefined) {
      return this.justify;
    }

    return this.showBorder ? SelectJustify.Left : SelectJustify.Right;
  }

  public constructor(private readonly loggerService: LoggerService, private readonly cdr: ChangeDetectorRef) {}

  public ngAfterContentInit(): void {
    this.allOptions$ = this.allOptionsList !== undefined ? queryListAndChanges$(this.allOptionsList) : EMPTY;
    this.filteredOptions$ = this.allOptions$.pipe(
      map(options => options.toArray()),
      switchMap(reorderedOptions => this.getFilteredOptions(reorderedOptions))
    );

    this.selected$ = this.buildObservableOfSelected();
    if (this.controlItems !== undefined) {
      this.topControlItems$ = queryListAndChanges$(this.controlItems).pipe(
        map(items => items.filter(item => item.position === SelectControlOptionPosition.Top))
      );
    }
  }

  public onPopoverClose(): void {
    this.popoverOpen = false;
    this.searchOptions('');
  }

  public getPrefixIcon(selectedOption: SelectOption<V> | undefined): string | undefined {
    return selectedOption?.icon ?? this.icon;
  }

  public ngOnChanges(changes: TypedSimpleChanges<this>): void {
    if (this.allOptionsList !== undefined && changes.selected !== undefined) {
      this.selected$ = this.buildObservableOfSelected();
    }
  }

  public isSelectedItem(item: SelectOptionComponent<V>): boolean {
    return isEqual(this.selected, item.value);
  }

  public updateGroupPosition(position: SelectGroupPosition): void {
    this.groupPosition = position;
    this.cdr.markForCheck();
  }

  public searchOptions(searchText: string): void {
    if (this.searchMode === SelectSearchMode.Disabled) {
      return;
    }

    if (this.searchMode === SelectSearchMode.CaseInsensitive) {
      this.caseInsensitiveSearchSubject.next(searchText);
    }

    this.searchText = searchText;
    this.searchValueChange.emit(searchText);
  }

  private getFilteredOptions(optionsList: SelectOptionComponent<V>[]): Observable<SelectOptionComponent<V>[]> {
    return combineLatest([of(optionsList), this.caseInsensitiveSearchSubject]).pipe(
      map(([options, searchText]) =>
        isEmpty(searchText)
          ? options
          : options.filter(option => option.label.toLowerCase().includes(searchText.toLowerCase()))
      )
    );
  }

  private buildObservableOfSelected(): Observable<SelectOption<V> | undefined> {
    return this.allOptions$.pipe(
      switchMap(items => merge(of(undefined), ...items.map(option => option.optionChange$))),
      map(() => this.findItem(this.selected))
    );
  }

  public onSelectionChange(item: SelectOptionComponent<V>): void {
    if (item.disabled) {
      return;
    }

    this.setSelection(item.value);
    this.propagateValue();
  }

  public onClearSelected(): void {
    this.setSelection();
    this.propagateValue();
  }

  private setSelection(value?: V): void {
    this.selected = value;
    this.selected$ = this.buildObservableOfSelected();
  }

  private findItem(value: V | undefined): SelectOption<V> | undefined {
    if (this.allOptionsList === undefined) {
      this.loggerService.warn(`Invalid items for select option '${String(value)}'`);

      return undefined;
    }

    return this.allOptionsList.find(item => isEqual(item.value, value));
  }

  public getStyleClassesForSelectItem(size: SelectSize, item: SelectOptionComponent<V>): string[] {
    const styles: string[] = [size];

    if (item.disabled) {
      styles.push('disabled');
    }

    return styles;
  }

  public writeValue(value?: V): void {
    this.setSelection(value);
    this.cdr.markForCheck();
  }

  public registerOnChange(onChange: (value: V | undefined) => void): void {
    this.propagateControlValueChange = onChange;
  }

  public registerOnTouched(onTouch: (value: V | undefined) => void): void {
    this.propagateControlValueChangeOnTouch = onTouch;
  }

  public setDisabledState(isDisabled?: boolean): void {
    this.disabled = isDisabled ?? false;
    this.cdr.markForCheck();
  }

  private propagateValue(): void {
    this.selectedChange.emit(this.selected);
    this.propagateValueChangeToFormControl(this.selected);
  }

  private propagateValueChangeToFormControl(value: V | undefined): void {
    this.propagateControlValueChange?.(value);
    this.propagateControlValueChangeOnTouch?.(value);
  }
}

export const enum SelectTriggerDisplayMode {
  MenuWithBorder = 'menu-with-border',
  MenuWithBackground = 'menu-with-background',
  Icon = 'icon'
}

export const enum SelectSearchMode {
  Disabled = 'disabled', // Search is not available
  CaseInsensitive = 'case-insensitive', // Current available values are filtered in a case insensitive way and an emit is triggered
  EmitOnly = 'emit-only' // Current available values not filtered, but an emit still triggered
}
