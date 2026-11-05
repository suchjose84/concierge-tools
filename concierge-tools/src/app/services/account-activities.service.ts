
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

export interface SharedActivityCasePayload {
  caseId: string;
  endingStatus: string;
}

export interface SaveSharedActivityPayload {
  note: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  cases: SharedActivityCasePayload[];
}

export interface SaveSharedActivityResponse {
  success: boolean;
  activityId: string;
}

export interface CompletedCaseReportRow {
  id: string;
  caseNumber: string;
  accountName: string;
  completedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccountActivitiesService {
  private readonly apiUrl =
    `${environment.apiUrl}/api/accounts`;

  constructor(private http: HttpClient) {}

  async saveSharedActivity(
    accountId: string,
    payload: SaveSharedActivityPayload
  ): Promise<SaveSharedActivityResponse> {
    return firstValueFrom(
      this.http.post<SaveSharedActivityResponse>(
        `${this.apiUrl}/${accountId}/activities/shared`,
        payload
      )
    );
  }

  getRecentCompletedCases(): Promise<CompletedCaseReportRow[]> {
    return firstValueFrom(
      this.http.get<CompletedCaseReportRow[]>(
        `${this.apiUrl}/completed-cases`
      )
    );
  }









}


