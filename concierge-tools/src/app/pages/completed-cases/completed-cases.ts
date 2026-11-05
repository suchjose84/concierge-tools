import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  ActivityReportApiService,
  CompletedCaseReportRow
} from '../../services/activity-report-api.service';

@Component({
  selector: 'app-completed-cases',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './completed-cases.html',
  styleUrl: './completed-cases.css',
})
export class CompletedCases implements OnInit {
  cases = signal<CompletedCaseReportRow[]>([]);
  loading = signal(false);
  errorMessage = signal('');

  constructor(private reportApi: ActivityReportApiService) {}

  ngOnInit(): void {
    void this.loadCompletedCases();
  }

  async loadCompletedCases(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const rows = await this.reportApi.getRecentCompletedCases();
      this.cases.set(rows);
    } catch (error: any) {
      console.error('Failed to load completed cases:', error);

      this.errorMessage.set(
        error?.error?.message ??
        'Unable to load completed cases.'
      );
    } finally {
      this.loading.set(false);
    }
  }
}