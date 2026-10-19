import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ActivityReportRow {
  id: string;
  accountName: string;
  activityType: string;
  contactType: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  note: string | null;
  caseNumbers: string;
  caseStatuses: string;
  eventType: string;
}

@Injectable({ providedIn: 'root' })
export class ActivityReportApiService {
  private readonly apiUrl =
    `${environment.apiUrl}/api/activity-report`;

  constructor(private http: HttpClient) {}

  getReport(
    fromDate: string,
    toDate: string
  ): Promise<ActivityReportRow[]> {
    return firstValueFrom(
      this.http.get<ActivityReportRow[]>(this.apiUrl, {
        params: { fromDate, toDate }
      })
    );
  }
}