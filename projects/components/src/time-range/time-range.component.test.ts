import { HttpClientTestingModule } from '@angular/common/http/testing';
import { discardPeriodicTasks, fakeAsync } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { IconLibraryTestingModule } from '@hypertrace/assets-library';
import {
  FixedTimeRange,
  NavigationService,
  RelativeTimeRange,
  TimeDuration,
  TimeRangeService,
  TimeUnit
} from '@hypertrace/common';
import { createComponentFactory, mockProvider } from '@ngneat/spectator/jest';
import { of } from 'rxjs';
import { ButtonVariant } from '../button/button';
import { RefreshButtonComponent } from '../refresh-button/refresh-button.component';
import { TimeRangeComponent } from './time-range.component';
import { TimeRangeModule } from './time-range.module';

describe('Time range component', () => {
  const createComponent = createComponentFactory({
    declareComponent: false,
    component: TimeRangeComponent,
    imports: [TimeRangeModule, HttpClientTestingModule, IconLibraryTestingModule],
    componentProviders: [],
    providers: [
      mockProvider(NavigationService, {
        navigation$: of({
          queryParamMap: of(convertToParamMap({}))
        } as ActivatedRoute)
      }),
      mockProvider(TimeRangeService, {
        getTimeRangeAndChanges: jest.fn().mockReturnValue(of(new RelativeTimeRange(new TimeDuration(1, TimeUnit.Hour))))
      })
    ]
  });

  test('should show default time range when instantiated', () => {
    const spectator = createComponent();
    expect(spectator.query('.trigger-label')).toHaveText('Last 1 hour');
  });

  test('should show predefined time overlay when trigger is clicked', () => {
    const spectator = createComponent();
    spectator.click('.trigger');
    expect(spectator.query('.predefined-time-range-selection', { root: true })).toExist();
  });

  test('should show predefined time range when Last 15 minutes is selected', () => {
    const spectator = createComponent({
      providers: [
        mockProvider(TimeRangeService, {
          getTimeRangeAndChanges: jest
            .fn()
            .mockReturnValue(of(new RelativeTimeRange(new TimeDuration(15, TimeUnit.Minute))))
        })
      ]
    });
    spectator.click('.trigger');
    spectator.click(spectator.queryAll('.popover-item', { root: true })[1]);
    expect(spectator.query('.trigger-label')).toHaveText('Last 15 minutes');
  });

  test('should dismiss custom time range form when cancel is clicked', () => {
    const spectator = createComponent();
    spectator.click('.trigger');
    spectator.click(spectator.queryAll('.popover-item', { root: true })[0]);
    expect(spectator.query('.custom-time-range-selection', { root: true })).toExist();

    spectator.click(spectator.queryAll('.custom-time-range-selection ht-button', { root: true })[0]);
    expect(spectator.query('.custom-time-range-selection', { root: true })).not.toExist();
  });

  test('should dismiss custom time range form when apply is clicked', () => {
    const spectator = createComponent();
    spectator.click('.trigger');
    spectator.click(spectator.queryAll('.popover-item', { root: true })[0]);
    expect(spectator.query('.custom-time-range-selection', { root: true })).toExist();

    spectator.click(spectator.queryAll('.custom-time-range-selection ht-button', { root: true })[1]);
    expect(spectator.query('.custom-time-range-selection', { root: true })).not.toExist();
  });

  test('should show custom time range when custom time applied ', () => {
    const spectator = createComponent({
      providers: [
        mockProvider(TimeRangeService, {
          getTimeRangeAndChanges: jest
            .fn()
            .mockReturnValue(of(new FixedTimeRange(new Date(1573255100253), new Date(1573255111159))))
        })
      ]
    });
    spectator.click('.trigger');
    spectator.click(spectator.queryAll('.popover-item', { root: true })[0]);
    expect(spectator.query('.custom-time-range-selection', { root: true })).toExist();

    spectator.click(spectator.queryAll('.custom-time-range-selection ht-button', { root: true })[1]);
    expect(spectator.query('.custom-time-range-selection', { root: true })).not.toExist();

    spectator.click(spectator.queryAll('.popover-item', { root: true })[1]);
    expect(spectator.query('.trigger-label')).toHaveText(' - ');
  });

  test('should show refresh button when time range is relative', () => {
    const spectator = createComponent();
    expect(spectator.query('.refresh')).toExist();
  });

  test('should not show refresh button when time range is fixed', () => {
    const spectator = createComponent({
      providers: [
        mockProvider(TimeRangeService, {
          getTimeRangeAndChanges: jest
            .fn()
            .mockReturnValue(of(new FixedTimeRange(new Date(1573255100253), new Date(1573255111159))))
        })
      ]
    });
    spectator.click('.trigger');
    spectator.click(spectator.queryAll('.popover-item', { root: true })[0]);
    expect(spectator.query('.custom-time-range-selection', { root: true })).toExist();

    spectator.click(spectator.queryAll('.custom-time-range-selection ht-button', { root: true })[1]);
    expect(spectator.query('.custom-time-range-selection', { root: true })).not.toExist();

    spectator.click(spectator.queryAll('.popover-item', { root: true })[1]);
    expect(spectator.query('.refresh')).not.toExist();
  });

  test('should publish new time range when refresh is clicked', () => {
    const spectator = createComponent();
    const spy = jest.spyOn(spectator.inject(TimeRangeService), 'refresh');
    spectator.click('.refresh');
    expect(spy).toHaveBeenCalled();
  });

  test('should update refresh button to primary after 5m', fakeAsync(() => {
    const spectator = createComponent();
    const refreshButton = spectator.query('.refresh', { read: RefreshButtonComponent })!;
    expect(refreshButton).toExist();
    expect(refreshButton.variant).toBe(ButtonVariant.Tertiary);
    spectator.tick(new TimeDuration(5, TimeUnit.Minute).toMillis());
    expect(refreshButton.variant).toBe(ButtonVariant.Primary);
    expect(refreshButton.label).toBe('Refresh - updated 5m ago');
    spectator.tick(new TimeDuration(30, TimeUnit.Second).toMillis());
    expect(refreshButton.label).toBe('Refresh - updated 5m ago');
    spectator.tick(new TimeDuration(30, TimeUnit.Second).toMillis());
    expect(refreshButton.label).toBe('Refresh - updated 6m ago');
    discardPeriodicTasks();
  }));
});
