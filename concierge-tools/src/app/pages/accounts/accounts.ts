import { Component, OnInit } from '@angular/core';
import { AccountsService } from '../../services/accounts.service';

interface Case {
  caseNumber: string;
  location: string;
  status: string;
  deadlineLabel: string;
  deadline: string;
}

interface Account {
  id: string;
  accountName: string;
  clientName: string;
  clientEmail: string;
  salesRepName: string;
  salesRepEmail: string;
  cases: Case[];
}

@Component({
  selector: 'app-accounts',
  standalone: true,
  templateUrl: './accounts.html',
  styleUrl: './accounts.css',
})
export class AccountsComponent implements OnInit {

  accounts: any[] = [];

  constructor(private accountsService: AccountsService) {}

  async ngOnInit() {
    try {
      this.accounts = await this.accountsService.getAccounts();

      console.log('Accounts from Supabase:', this.accounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  }

  openAccount(account: any): void {
    console.log('Open account:', account);
  }

  createAccount(): void {
    console.log('Create new account');
  }
}
