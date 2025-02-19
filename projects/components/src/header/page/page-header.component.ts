import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  ApplicationFeature,
  Breadcrumb,
  isNonEmptyString,
  NavigationService,
  PreferenceService,
  SubscriptionLifecycle
} from '@hypertrace/common';
import { Observable, of } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { BreadcrumbsService } from '../../breadcrumbs/breadcrumbs.service';
import { IconSize } from '../../icon/icon-size';
import { NavigableTab } from '../../tabs/navigable/navigable-tab';

@Component({
  selector: 'ht-page-header',
  styleUrls: ['./page-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SubscriptionLifecycle],
  template: `
    <div
      *ngIf="this.breadcrumbs$ | async as breadcrumbs"
      class="page-header"
      [class.bottom-border]="!this.tabs?.length"
    >
      <!--      Code Path 1-->
      <div
        *htIfFeature="'${ApplicationFeature.PageTimeRange}' | htFeature; else noTimeRangeHeaderLayoutTemplate"
        class="column-alignment"
      >
        <div class="primary-row">
          <ng-container *ngTemplateOutlet="this.breadCrumbContainerTemplate"></ng-container>

          <ng-container *ngIf="this.contentAlignment === '${PageHeaderContentAlignment.Row}'">
            <ng-container *ngTemplateOutlet="this.projectedContentTemplate"></ng-container>
          </ng-container>
          <ng-container *ngIf="this.shouldShowTimeRange">
            <ht-page-time-range class="time-range"></ht-page-time-range>
          </ng-container>
          <ng-container *ngIf="this.shouldShowRefreshButton">
            <ht-refresh-button class="refresh-only-button" (click)="this.refresh.emit()"></ht-refresh-button>
          </ng-container>
        </div>
        <ng-container *ngIf="this.contentAlignment === '${PageHeaderContentAlignment.Column}'">
          <ng-container *ngTemplateOutlet="this.projectedContentTemplate"></ng-container>
        </ng-container>
      </div>

      <!--      Code Path 2-->
      <ng-template #noTimeRangeHeaderLayoutTemplate>
        <div [ngClass]="this.contentAlignment">
          <ng-container *ngTemplateOutlet="this.breadCrumbContainerTemplate"></ng-container>

          <ng-container *ngTemplateOutlet="this.projectedContentTemplate"></ng-container>
        </div>
      </ng-template>

      <ht-navigable-tab-group *ngIf="this.tabs?.length" class="tabs" (tabChange)="this.onTabChange($event)">
        <ht-navigable-tab
          *ngFor="let tab of this.tabs"
          [path]="tab.path"
          [hidden]="tab.hidden"
          [features]="tab.features"
        >
          {{ tab.label }}
        </ht-navigable-tab>
      </ht-navigable-tab-group>

      <ng-template #projectedContentTemplate>
        <ng-content></ng-content>
      </ng-template>

      <ng-template #breadCrumbContainerTemplate>
        <div class="breadcrumb-container">
          <ht-breadcrumbs [breadcrumbs]="breadcrumbs"></ht-breadcrumbs>
          <div class="title" *ngIf="this.titleCrumb$ | async as titleCrumb">
            <ht-icon
              class="icon"
              *ngIf="titleCrumb.icon && breadcrumbs.length <= 1"
              [icon]="titleCrumb.icon"
              [label]="titleCrumb.label"
              size="${IconSize.Large}"
            ></ht-icon>

            <ht-label [label]="titleCrumb.label"></ht-label>
            <ht-beta-tag *ngIf="this.isBeta" class="beta"></ht-beta-tag>
          </div>
        </div>
      </ng-template>
    </div>
  `
})
export class PageHeaderComponent implements OnInit {
  @Input()
  public persistenceId?: string;

  @Input()
  public tabs?: NavigableTab[] = [];

  @Input()
  public isBeta: boolean = false;

  @Input()
  public mode?: PageHeaderDisplayMode = PageHeaderDisplayMode.WithTimeRange;

  /**
   * The provided value is mapped to `mode` for backwards compatibility.
   * Please use `mode` instead.
   * @deprecated - Use the mode instead
   */
  @Input()
  public set hidePageTimeRange(hidePageTimeRange: boolean) {
    this.mode = hidePageTimeRange ? PageHeaderDisplayMode.Default : PageHeaderDisplayMode.WithTimeRange;
  }

  @Input()
  public contentAlignment: PageHeaderContentAlignment = PageHeaderContentAlignment.Column;

  @Output()
  public readonly refresh: EventEmitter<void> = new EventEmitter<void>();

  public breadcrumbs$: Observable<Breadcrumb[] | undefined> = this.breadcrumbsService.breadcrumbs$.pipe(
    map(breadcrumbs => (breadcrumbs.length > 0 ? breadcrumbs : undefined))
  );

  public titleCrumb$: Observable<Breadcrumb | undefined> = this.breadcrumbsService.breadcrumbs$.pipe(
    map(breadcrumbs => (breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : {}))
  );

  public constructor(
    protected readonly navigationService: NavigationService,
    protected readonly preferenceService: PreferenceService,
    protected readonly subscriptionLifecycle: SubscriptionLifecycle,
    protected readonly breadcrumbsService: BreadcrumbsService
  ) {}

  public ngOnInit(): void {
    this.subscriptionLifecycle.add(
      this.getPreferences().subscribe(preferences => this.navigateIfPersistedActiveTab(preferences))
    );
  }

  public get shouldShowTimeRange(): boolean {
    return this.mode === PageHeaderDisplayMode.WithTimeRange;
  }

  public get shouldShowRefreshButton(): boolean {
    return this.mode === PageHeaderDisplayMode.WithRefreshButton;
  }

  private navigateIfPersistedActiveTab(preferences: PageHeaderPreferences): void {
    if (isNonEmptyString(this.persistenceId) && isNonEmptyString(preferences.selectedTabPath)) {
      this.navigationService.navigateWithinApp(
        preferences.selectedTabPath,
        this.navigationService.getCurrentActivatedRoute().parent!
      );
    }
  }

  public onTabChange(path?: string): void {
    this.setPreferences(path);
  }

  private getPreferences(): Observable<PageHeaderPreferences> {
    return isNonEmptyString(this.persistenceId)
      ? this.preferenceService.get<PageHeaderPreferences>(this.persistenceId, {}).pipe(first())
      : of({});
  }

  private setPreferences(selectedTabPath?: string): void {
    if (isNonEmptyString(this.persistenceId)) {
      this.preferenceService.set(this.persistenceId, {
        selectedTabPath: selectedTabPath
      });
    }
  }
}

interface PageHeaderPreferences {
  selectedTabPath?: string;
}

export const enum PageHeaderContentAlignment {
  Column = 'column-alignment',
  Row = 'row-alignment'
}

/**
 * @param Default - Default mode with no time range or refresh button
 */
export const enum PageHeaderDisplayMode {
  Default = 'default',
  WithTimeRange = 'with-time-range',
  WithRefreshButton = 'with-refresh'
}
