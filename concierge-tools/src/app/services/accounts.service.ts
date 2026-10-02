import { Injectable } from '@angular/core';

import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AccountsService {

  constructor(private supabaseService: SupabaseService) {}

  async getAccounts() {
    const { data, error } = await this.supabaseService.client
      .from('accounts')
      .select('*');

    if (error) {
      throw error;
    }

    return data;
  }
}