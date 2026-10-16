import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AccountsService {

  constructor(private http: HttpClient) {}

  async getAccounts() {
    return firstValueFrom(
      this.http.get<any[]>(
        `${environment.apiUrl}/api/Accounts`
      )
    );
  }
}
