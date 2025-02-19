import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  TemplateRef,
  ViewChild
} from '@angular/core';
import {
  ControlValueAccessor,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  NG_VALUE_ACCESSOR,
  Validators
} from '@angular/forms';
import { IconType } from '@hypertrace/assets-library';
import {
  Color,
  getStringFromPasteEvent,
  getStringsFromCommaSeparatedList,
  isEnterKeyEvent,
  isEnterOrCommaKeyEvent,
  TypedSimpleChanges
} from '@hypertrace/common';
import { debounce, isEmpty, uniq } from 'lodash-es';
import { IconSize } from '../icon/icon-size';
import { InputAppearance } from '../input/input-appearance';
import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { PopoverBackdrop, PopoverPositionType, PopoverRelativePositionLocation } from '../popover/popover';
import { PopoverService } from '../popover/popover.service';
import { PopoverRef } from '../popover/popover-ref';

@Component({
  selector: 'ht-input-pill-list',
  template: `
    <div class="input-pill-list" [formGroup]="this.form">
      <div class="header">
        <ht-form-field class="form-field">
          <ht-input
            #input
            [disabled]="this.shouldDisableAdd"
            class="input primary-input"
            formControlName="inputBuffer"
            (focusin)="this.onFocus()"
            (keydown)="this.addBufferValueToList($event)"
            (paste)="this.onContentPaste($event)"
            [placeholder]="this.placeholder"
            appearance="${InputAppearance.Border}"
          ></ht-input>
        </ht-form-field>
      </div>

      <ng-container formArrayName="pillControls">
        <div class="pill-list" *ngIf="this.pillControlsArray.value.length > 0">
          <div class="pill" *ngFor="let pillValueControl of this.pillControlsArray?.controls; index as index">
            <ht-form-field class="form-field" [formGroup]="pillValueControl" contentBgColor="${Color.Blue1}">
              <ht-input
                class="input secondary-input"
                [disabled]="this.shouldDisableUpdate"
                appearance="${InputAppearance.Border}"
                (valueChange)="this.updateValue()"
                formControlName="value"
              ></ht-input>
            </ht-form-field>
            <ht-icon
              class="close-icon"
              [ngClass]="{ disabled: this.shouldDisableDelete }"
              icon="${IconType.CloseCircle}"
              size="${IconSize.Small}"
              (click)="this.removeValue(index)"
            ></ht-icon>
          </div>
        </div>
      </ng-container>

      <ng-template #dropdownValuesTemplate>
        <div class="dropdown-values">
          <ht-event-blocker event="click">
            <div
              *ngFor="let value of this.dropdownValues$ | async"
              class="dropdown-value"
              (click)="this.onDropdownValueClick(value)"
            >
              {{ value }}
            </div>
          </ht-event-blocker>
        </div>
      </ng-template>
    </div>
  `,
  styleUrls: ['./input-pill-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: InputPillListComponent
    }
  ]
})
export class InputPillListComponent implements ControlValueAccessor, OnChanges {
  @Input()
  public readonly values: string[] = [];

  @Input()
  public readonly disableAdd: boolean = false;

  @Input()
  public readonly disableUpdate: boolean = false;

  @Input()
  public readonly disableDelete: boolean = false;

  @Input()
  public readonly disabled: boolean = false;

  @Input()
  public readonly allowCommaInInput: boolean = true;

  @Input()
  public readonly placeholder: string = 'Type in a value and hit enter';

  @Input()
  public readonly dropdownValues: string[] = [];

  @Output()
  public readonly valueChange: EventEmitter<string[]> = new EventEmitter();

  @ViewChild('dropdownValuesTemplate')
  private readonly dropdownValuesTemplate!: TemplateRef<unknown>;

  @ViewChild('input', { read: ElementRef })
  private readonly input!: ElementRef<unknown>;

  public readonly form: UntypedFormGroup = new UntypedFormGroup({
    inputBuffer: new UntypedFormControl(''),
    pillControls: new UntypedFormArray([])
  });

  public currentValues: string[] = [];
  public dropdownValues$: Observable<string[]> = of([]);

  private popover?: PopoverRef;
  private propagateControlValueChange?: (value: string[]) => void;
  private propagateControlValueChangeOnTouch?: (value: string[]) => void;

  public constructor(
    private readonly formBuilder: UntypedFormBuilder,
    private readonly popoverService: PopoverService
  ) {}

  public ngOnChanges(changes: TypedSimpleChanges<this>): void {
    if (changes.values) {
      this.initForm(this.values);
    }

    if (changes.dropdownValues) {
      this.dropdownValues$ = this.form.controls.inputBuffer.valueChanges.pipe(
        startWith(''),
        map(bufferValue => this.dropdownValues.filter(value => value.includes(bufferValue ?? '')))
      );
    }
  }

  public addBufferValueToList(event: KeyboardEvent): void {
    // If comma input is allowed and the key pressed is not an enter key, then ignore.
    // Or, if the key pressed is not a comma or enter, ignore.
    if ((this.allowCommaInInput && !isEnterKeyEvent(event)) || !isEnterOrCommaKeyEvent(event)) {
      return;
    }
    // Do not propagate Enter key or comma presses
    event.preventDefault();

    // Process input buffer
    const input: string = this.inputBufferFormControl.value.trim();
    this.addValues([input]);
  }

  public onContentPaste(event: ClipboardEvent): void {
    const pastedText: string = getStringFromPasteEvent(event);
    this.addValues(getStringsFromCommaSeparatedList(pastedText));
  }

  public removeValue(index: number): void {
    if (this.shouldDisableUpdate) {
      return;
    }
    this.pillControlsArray.removeAt(index);
    this.notifyValueChange();
  }

  /**
   * Update function is triggered on value update in the input forms.
   * To prevent unnecessary emits, debounce it
   */
  public updateValue: () => void = debounce(this.notifyValueChange, 200);

  public get shouldDisableAdd(): boolean {
    return this.disabled || this.disableAdd;
  }
  public get shouldDisableUpdate(): boolean {
    return this.disabled || this.disableUpdate;
  }

  public get shouldDisableDelete(): boolean {
    return this.disabled || this.disableDelete;
  }

  public writeValue(values: string[]): void {
    this.initForm(values);
  }

  public registerOnChange(onChange: (value: string[]) => void): void {
    this.propagateControlValueChange = onChange;
  }

  public registerOnTouched(onTouch: (value: string[]) => void): void {
    this.propagateControlValueChangeOnTouch = onTouch;
  }

  public onFocus() {
    if (this.dropdownValues.length > 0) {
      this.showPopover();
    }
  }

  public onDropdownValueClick(value: string): void {
    this.addValues([value]);
    this.closePopover();
  }

  public get pillControlsArray(): UntypedFormArray {
    return this.form.get('pillControls') as UntypedFormArray;
  }

  private addValues(values: string[]): void {
    const existingValues = this.getValuesFromPills();
    uniq(values)
      .filter(value => !isEmpty(value))
      .filter(value => !existingValues.includes(value))
      .forEach(value => this.pillControlsArray?.insert(0, this.buildSinglePillForm(value)));
    this.inputBufferFormControl.reset();
    this.notifyValueChange();
  }

  private propagateValueChangeToFormControl(value: string[]): void {
    this.propagateControlValueChange?.(value);
    this.propagateControlValueChangeOnTouch?.(value);
  }

  private buildFormArray(values: string[]): UntypedFormArray {
    return this.formBuilder.array(values.map(value => this.buildSinglePillForm(value)));
  }

  private getValuesFromPills(): string[] {
    return (this.pillControlsArray.value ?? []).map((pill: { value: string }) => pill.value);
  }

  private buildSinglePillForm(value: string): UntypedFormGroup {
    return new UntypedFormGroup({ value: new UntypedFormControl(value, Validators.required) });
  }

  private get inputBufferFormControl(): UntypedFormControl {
    return this.form.get('inputBuffer') as UntypedFormControl;
  }

  private initForm(values: string[]): void {
    this.form.setControl('pillControls', this.buildFormArray(values));
  }

  private notifyValueChange(): void {
    const validValues = this.getValuesFromPills().filter(value => !isEmpty(value));
    this.valueChange.next(validValues);
    this.propagateValueChangeToFormControl(validValues);
  }

  private showPopover(): void {
    this.closePopover();

    this.popover = this.popoverService.drawPopover({
      position: {
        type: PopoverPositionType.Relative,
        origin: this.input,
        locationPreferences: [
          PopoverRelativePositionLocation.BelowLeftAligned,
          PopoverRelativePositionLocation.BelowRightAligned,
          PopoverRelativePositionLocation.AboveLeftAligned,
          PopoverRelativePositionLocation.AboveRightAligned
        ]
      },
      componentOrTemplate: this.dropdownValuesTemplate,
      backdrop: PopoverBackdrop.Transparent
    });
    this.popover.closeOnBackdropClick();
  }

  private closePopover(): void {
    this.popover?.close();
    this.popover = undefined;
  }
}
