import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Account } from '../models/account.model';

export interface NewAccountDetails {
  accountName: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientTimezone: string | null;
  salesRepName: string | null;
  salesRepEmail: string | null;
  salesRepPhone: string | null;
}

export interface NewCaseDetails {
  caseNumber: string;
  productType: string | null;
  orderDeadline: string | null;
  artDeadline: string | null;
  mailDate: string | null;
  notes: string | null;
}

export interface CreateAccountWithCasesPayload {
  accountId: string | null;
  account?: NewAccountDetails | null;
  cases: NewCaseDetails[];
}

export interface CreateAccountWithCasesResponse {
  accountId: string;
  casesCreated: number;
  caseIds: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AccountsService {
  constructor(private http: HttpClient) {}

  async getAccounts(): Promise<Account[]> {
    return firstValueFrom(
      this.http.get<Account[]>(
        `${environment.apiUrl}/api/Accounts`
      )
    );
  }

  async createAccountWithCases(
    payload: CreateAccountWithCasesPayload
  ): Promise<CreateAccountWithCasesResponse> {
    return firstValueFrom(
      this.http.post<CreateAccountWithCasesResponse>(
        `${environment.apiUrl}/api/Accounts/with-cases`,
        payload
      )
    );
  }

  
  async closeAccount(id: string): Promise<void> {
    await firstValueFrom(this.http.patch<void>(`${environment.apiUrl}/api/Accounts/${id}/close`,{}));
  }

  async updateAccount(
    id: string,
    payload: {
      accountName: string;
      clientName: string | null;
      clientEmail: string | null;
      clientPhone: string | null;
      clientTimezone: string | null;
      salesRepName: string | null;
      salesRepEmail: string | null;
      salesRepPhone: string | null;
    }
  ): Promise<void> {
    await firstValueFrom(
      this.http.patch<void>(
        `${environment.apiUrl}/api/Accounts/${id}`,
        payload
      )
    );
  }




}
