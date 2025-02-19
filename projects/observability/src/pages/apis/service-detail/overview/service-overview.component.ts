import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReplayObservable } from '@hypertrace/common';
import { map } from 'rxjs/operators';
import { NavigableDashboardFilterConfig } from '../../../../shared/dashboard/dashboard-wrapper/navigable-dashboard.component';
import { ServiceDetailService } from '../service-detail.service';
import { serviceOverviewDashboard } from './service-overview.dashboard';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ht-navigable-dashboard
      *htLoadAsync="this.filterConfig$ as filterConfig"
      navLocation="${serviceOverviewDashboard.location}"
      [filterConfig]="filterConfig"
    >
    </ht-navigable-dashboard>
  `
})
export class ServiceOverviewComponent {
  public readonly filterConfig$: ReplayObservable<NavigableDashboardFilterConfig>;
  public constructor(serviceDetailService: ServiceDetailService) {
    this.filterConfig$ = serviceDetailService.entityFilter$.pipe(
      map(filter => ({
        implicitFilters: [filter]
      }))
    );
  }
}
