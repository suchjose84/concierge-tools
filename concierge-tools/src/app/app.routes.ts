import { Routes } from '@angular/router';

import { EmailTemplateComponent } from './pages/email-template/email-template';
import { QualityComponent } from './pages/quality/quality';
import { HistoryPageComponent } from './pages/history-page/history-page';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'templates',
    pathMatch: 'full',
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
];
