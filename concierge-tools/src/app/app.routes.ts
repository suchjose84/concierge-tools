import { Routes } from '@angular/router';

import { EmailTemplateComponent } from './pages/email-template/email-template';
import { QualityComponent } from './pages/quality/quality';
import { HistoryPageComponent } from './pages/history-page/history-page';
import { DeadlineTemplateComponent } from './pages/deadline/deadline';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'accounts',
    pathMatch: 'full',
  },
  {
    path: 'accounts',
    loadComponent: () =>
      import('./pages/accounts/accounts').then(
        m => m.AccountsComponent
      ),
  },
  {
    path: 'accounts/:id/shared-activity',
    loadComponent: () =>
      import('./pages/activity-workspace/activity-workspace').then(
        m => m.ActivityWorkspaceComponent
      ),
  },
  {
    path: 'accounts/:id',
    loadComponent: () =>
      import('./pages/account-workspace/account-workspace').then(
        m => m.AccountWorkspaceComponent
      ),
  },
  {
    path: 'cases/:id',
    loadComponent: () =>
      import('./pages/activity-workspace/activity-workspace').then(
        m => m.ActivityWorkspaceComponent
      ),
  },
  {
    path: 'templates',
    component: EmailTemplateComponent,
  },
  {
    path: 'quality',
    component: QualityComponent,
  },
  {
    path: 'history',
    component: HistoryPageComponent,
  },
  {
    path: 'deadline',
    component: DeadlineTemplateComponent,
  },
  {
    path: 'activity-report',
    loadComponent: () =>
      import('./pages/activity-report/activity-report').then(
        m => m.ActivityReportComponent
      ),
  },
];