import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { RouterModule } from '@angular/router';
import { MemoizeModule } from '@hypertrace/common';
import { FeatureConfigCheckModule } from '../../feature-check/feature-config-check.module';
import { InfoIconModule } from '../../info-icon/info-icon.module';
import { LabelTagModule } from '../../label-tag/label-tag.module';
import { LetAsyncModule } from '../../let-async/let-async.module';
import { LinkModule } from '../../link/link.module';
import { NavigableTabGroupComponent } from './navigable-tab-group.component';
import { NavigableTabComponent } from './navigable-tab.component';

@NgModule({
  declarations: [NavigableTabGroupComponent, NavigableTabComponent],
  exports: [NavigableTabGroupComponent, NavigableTabComponent],
  imports: [
    MatTabsModule,
    CommonModule,
    RouterModule,
    LetAsyncModule,
    FeatureConfigCheckModule,
    MemoizeModule,
    LinkModule,
    LabelTagModule,
    InfoIconModule
  ]
})
export class NavigableTabModule {}
