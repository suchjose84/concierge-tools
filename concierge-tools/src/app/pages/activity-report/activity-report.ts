import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import * as XLSX from 'xlsx';
import {
  ActivityReportApiService,
  ActivityReportRow
} from '../../services/activity-report-api.service';

@Component({
  selector: 'app-activity-report',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './activity-report.html',
  styleUrl: './activity-report.css'
})
export class ActivityReportComponent implements OnInit {
  activities = signal<ActivityReportRow[]>([]);
  loading = signal(false);
  errorMessage = signal('');

  fromDate = '';
  toDate = '';

  constructor(private reportApi: ActivityReportApiService) {}

  ngOnInit(): void {
    const today = this.getManilaDateString();

    this.fromDate = today;
    this.toDate = today;

    void this.loadReport();
  }

  private getManilaDateString(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());

    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  }

  async loadReport(): Promise<void> {
    this.errorMessage.set('');

    if (this.fromDate && this.toDate &&
        this.fromDate > this.toDate) {
      this.errorMessage.set(
        'Start date cannot be later than end date.'
      );
      return;
    }

    this.loading.set(true);

    try {
      const rows = await this.reportApi.getReport(
        this.fromDate,
        this.toDate
      );
      this.activities.set(rows);
    } catch (error: any) {
      console.error('Failed to load activity report:', error);
      this.errorMessage.set(
        error?.error?.message ??
        'Unable to load the activity report.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  formatDuration(seconds: number): string {
    const total = Math.max(0, seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;

    return [hours, minutes, remainingSeconds]
      .map(value => String(value).padStart(2, '0'))
      .join(':');
  }

  get totalDurationSeconds(): number {
    return this.accountActivities.reduce(
      (total, activity) => total + activity.durationSeconds,
      0
    );
  }

  get accountActivities(): ActivityReportRow[] {
    return this.activities().filter(activity => {
      const eventType = (activity.eventType ?? '').toLowerCase();

      return ![
        'workday start',
        'workday end',
        'huddle'
      ].includes(eventType);
    });
  }

  get activityCount(): number {
    return this.accountActivities.length;
  }


  
  private formatManilaDateTime(
    value: string | Date | null | undefined
  ): string {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  }

  
  exportToExcel(): void {
    const reportRows = this.activities().map(activity => ({
      'Case Number': activity.caseNumbers || '',
      'Start Time': this.formatManilaDateTime(activity.startedAt),
      'End Time': activity.endedAt
        ? this.formatManilaDateTime(activity.endedAt)
        : 'In progress',
      'Ending Status': (activity.caseStatuses || '')
        .replace(/\b\d+\s*[—–\-:]\s*/g, '')
        .trim(),
      'Notes': activity.note || ''
    }));

    if (reportRows.length === 0) {
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(reportRows);

    worksheet['!cols'] = [
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 30 },
      { wch: 60 }
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Activity Report'
    );

    XLSX.writeFile(
      workbook,
      `activity-report-${this.fromDate}.xlsx`
    );
  }




}