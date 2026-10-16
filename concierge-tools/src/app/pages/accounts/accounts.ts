
import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import { AccountsService } from '../../services/accounts.service';

interface Case {
  id: string;
  accountId: string;
  caseNumber: string | null;
  productType: string | null;
  status: string | null;
  orderDeadline: string | null;
  artDeadline: string | null;
  mailDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Account {
  id: string;
  accountName: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientTimezone: string | null;
  salesRepName: string | null;
  salesRepEmail: string | null;
  salesRepPhone: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  closedAt: string | null;
  cases: Case[];
}

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './accounts.html',
  styleUrl: './accounts.css',
})
export class AccountsComponent implements OnInit {

  accounts = signal<Account[]>([]);

  constructor(
    private accountsService: AccountsService,
    private router: Router
  ) {}

  async ngOnInit() {
    try {
      const data = await this.accountsService.getAccounts();

      console.log('Accounts from .NET API:', data);

      this.accounts.set(data ?? []);

    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  }

  openAccount(account: Account): void {
    this.router.navigate(['/accounts', account.id]);
  }

  createAccount(): void {
    console.log('Create new account');
  }
}
