
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Case } from '../models/case.model';
import { Activity } from '../models/activity.model';

export interface SaveActivityPayload {
  endingStatus: string;
  note: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
}

@Injectable({
  providedIn: 'root'
})
export class CasesApiService {
  private readonly apiUrl = `${environment.apiUrl}/api/Cases`;

  constructor(private http: HttpClient) {}

  async getCaseById(caseId: string): Promise<Case> {
    return firstValueFrom(
      this.http.get<Case>(`${this.apiUrl}/${caseId}`)
    );
  }

  async getActivities(caseId: string): Promise<Activity[]> {
    return firstValueFrom(
      this.http.get<Activity[]>(
        `${this.apiUrl}/${caseId}/activities`
      )
    );
  }

  async saveActivity(
    caseId: string,
    payload: SaveActivityPayload
  ): Promise<{ activityId: string }> {
    return firstValueFrom(
      this.http.post<{ activityId: string }>(
        `${this.apiUrl}/${caseId}/activities`,
        payload
      )
    );
  }
}
