
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

export interface HuddleSession {
  id: string;
  workdayId?: string;
  startedAt: string;
  endedAt: string | null;
  shiftDate?: string;
}

export interface Workday {
  id: string;
  userKey: string;
  startedAt: string;
  endedAt: string | null;
  activeHuddle?: HuddleSession | null;
}

@Injectable({
  providedIn: 'root'
})
export class WorkdaysApiService {
  private readonly apiUrl =
    `${environment.apiUrl}/api/Workdays`;

  constructor(private http: HttpClient) {}

  async getActiveWorkday(): Promise<Workday | null> {
    const response = await firstValueFrom(
      this.http.get<{ workday: Workday | null }>(
        `${this.apiUrl}/active`
      )
    );

    return response.workday;
  }

  
    
    async startWorkday(shiftDate: string): Promise<Workday> {
    return firstValueFrom(
        this.http.post<Workday>(
        `${this.apiUrl}/start`,
        { shiftDate }
        )
    );
    }



  async endWorkday(): Promise<{
    id: string;
    endedAt: string;
  }> {
    return firstValueFrom(
      this.http.post<{ id: string; endedAt: string }>(
        `${this.apiUrl}/end`,
        {}
      )
    );
  }

  async startHuddle(): Promise<HuddleSession> {
    return firstValueFrom(
      this.http.post<HuddleSession>(
        `${this.apiUrl}/huddle/start`,
        {}
      )
    );
  }

  async endHuddle(): Promise<HuddleSession> {
    return firstValueFrom(
      this.http.post<HuddleSession>(
        `${this.apiUrl}/huddle/end`,
        {}
      )
    );
  }
}
